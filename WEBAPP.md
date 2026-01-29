# Web App Deployment Guide

## Overview

SteamBBEditor is a **static web application** (HTML, CSS, JavaScript). No backend server required - just static file hosting with a CDN.

**Target URL:** `https://steambbeditor.onemoregame.com`

---

## What Gets Deployed

```bash
npm run build
```

Outputs to `dist/` folder (~200KB):
```
dist/
├── index.html
└── assets/
    ├── index-*.css    (~18KB)
    └── index-*.js     (~180KB)
```

That's it. No database, no API, no server-side code.

---

## Option 1: AWS Amplify (Recommended)

**Pros:** Fastest setup, auto-deploy on git push, managed SSL, no Terraform needed.

### Manual Setup (5 minutes)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. **New app** → **Host web app** → **GitHub**
3. Authorize and select repo: `PlayOneMoreGame/steam-bbcode`
4. Branch: `main`
5. Build settings will auto-detect, or use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

6. **Deploy**
7. Go to **Domain management** → **Add domain**
8. Enter: `onemoregame.com`
9. Add subdomain: `steambbeditor`
10. Amplify provides DNS records to add to Route 53

### Amplify Terraform (if preferred)

```hcl
resource "aws_amplify_app" "steambbeditor" {
  name       = "steambbeditor"
  repository = "https://github.com/PlayOneMoreGame/steam-bbcode"

  oauth_token = var.github_token  # GitHub personal access token

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  environment_variables = {
    NODE_ENV = "production"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.steambbeditor.id
  branch_name = "main"
  
  enable_auto_build = true
}

resource "aws_amplify_domain_association" "steambbeditor" {
  app_id      = aws_amplify_app.steambbeditor.id
  domain_name = "onemoregame.com"

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "steambbeditor"
  }
}
```

**Cost:** Free tier covers 1000 build minutes/month, 15GB served/month. Likely $0 for internal tool.

---

## Option 2: S3 + CloudFront (Full Control)

**Pros:** Standard AWS pattern, full Terraform control, cheaper at scale.

### Terraform

```hcl
# Variables
variable "domain_name" {
  default = "steambbeditor.onemoregame.com"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for onemoregame.com"
}

# S3 Bucket for static files
resource "aws_s3_bucket" "website" {
  bucket = var.domain_name
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"  # SPA fallback
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# ACM Certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.hosted_zone_id
}

resource "aws_acm_certificate_validation" "website" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.website.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"  # US, Canada, Europe only

  origin {
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = "S3-${var.domain_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.domain_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400     # 1 day
    max_ttl     = 31536000  # 1 year
  }

  # SPA: return index.html for 404s
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_acm_certificate_validation.website]
}

# Route 53 DNS Record
resource "aws_route53_record" "website" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Outputs
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.website.id
}

output "website_url" {
  value = "https://${var.domain_name}"
}
```

**Provider config needed:**

```hcl
provider "aws" {
  region = "us-west-2"  # or your preferred region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"  # Required for ACM certs used by CloudFront
}
```

**Cost:** ~$1-5/month (S3 storage minimal, CloudFront has free tier)

---

## Option 3: Simple S3 Only (No HTTPS)

For internal/testing only. No custom domain SSL.

```bash
# Create bucket
aws s3 mb s3://steambbeditor-omg

# Enable static website hosting
aws s3 website s3://steambbeditor-omg --index-document index.html

# Upload files
npm run build
aws s3 sync dist/ s3://steambbeditor-omg --delete

# Access at:
# http://steambbeditor-omg.s3-website-us-west-2.amazonaws.com
```

---

## CI/CD: Auto-Deploy on Push

Add this GitHub Action to auto-deploy when pushing to `main`:

### For S3 + CloudFront

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run test:run
      - run: npm run build

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Deploy to S3
        run: aws s3 sync dist/ s3://steambbeditor.onemoregame.com --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

### Required GitHub Secrets

Add these in repo Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `CLOUDFRONT_DISTRIBUTION_ID` | From Terraform output |

### IAM Policy for Deploy User

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::steambbeditor.onemoregame.com",
        "arn:aws:s3:::steambbeditor.onemoregame.com/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "*"
    }
  ]
}
```

---

## DNS Configuration

If using Route 53 for `onemoregame.com`:

### For Amplify
Amplify provides the records automatically in the console.

### For CloudFront
Terraform creates the record, or manually add:

| Type | Name | Value |
|------|------|-------|
| A | steambbeditor | Alias to CloudFront distribution |

### For External DNS (non-Route 53)
Add CNAME:

| Type | Name | Value |
|------|------|-------|
| CNAME | steambbeditor | d1234abcd.cloudfront.net |

---

## Summary

| Option | Setup Time | Auto-Deploy | SSL | Terraform | Cost |
|--------|-----------|-------------|-----|-----------|------|
| Amplify | 5 min | ✅ Built-in | ✅ Auto | Optional | Free tier |
| S3 + CloudFront | 30 min | ✅ GitHub Action | ✅ ACM | Yes | ~$1-5/mo |
| S3 Only | 2 min | ✅ GitHub Action | ❌ | Optional | ~$0.50/mo |

**Recommendation:** Start with Amplify. It's the fastest path to `https://steambbeditor.onemoregame.com` with zero infrastructure maintenance.

---

## Questions?

Contact Jeff or see the main [README.md](README.md) for app documentation.
