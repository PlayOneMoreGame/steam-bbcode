#########################################################################
#
#                 -- Generated with omgcmd --
#      (do not edit unless you know what you're doing)
#
#########################################################################

# Copyright (C) 2022 One More Game - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tf-root"
    storage_account_name = "omgtfroot"
    container_name       = "tfstate"
    key                  = "steam-bbcode.environments.staging.tfstate"
  }

  required_version = ">= 0.13"

  required_providers {
    acme = {
      source  = "vancluever/acme"
      version = "~> 2.20"
    }
    aws = {
      version = "~> 6.20"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    rollbar = {
      source  = "rollbar/rollbar"
      version = "~> 1.15.0"
    }
  }
}

provider "acme" {
  server_url = "https://acme-v02.api.letsencrypt.org/directory"
}

provider "aws" {
  region  = "us-west-2"
  profile = var.use_assume_role ? null : "dev"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["dev"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["dev"]
      build_role_arn = module.const.build_role_arns["dev"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "us_east"
  region  = "us-east-1"
  profile = var.use_assume_role ? null : "dev"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["dev"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["dev"]
      build_role_arn = module.const.build_role_arns["dev"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "eu_north"
  region  = "eu-north-1"
  profile = var.use_assume_role ? null : "dev"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["dev"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["dev"]
      build_role_arn = module.const.build_role_arns["dev"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

provider "aws" {
  alias   = "core"
  region  = "us-west-2"
  profile = var.use_assume_role ? null : "core"

  allowed_account_ids = var.use_assume_role ? null : [ module.const.account_ids_by_env["core"] ]

  dynamic "assume_role" {
    for_each = var.use_assume_role ? [{
      admin_role_arn = module.const.admin_arns_by_env["core"]
      build_role_arn = module.const.build_role_arns["core"]
    }] : []
    content {
      role_arn = assume_role.value[local.assume_role_type]
    }
  }
}

data "aws_ssm_parameter" "rollbar_api_key" {
  name = "/omg/dev/ci/rollbar_api_key"
}

provider "rollbar" {
  api_key = data.aws_ssm_parameter.rollbar_api_key.value
}

locals {
  project_name           = "steam-bbcode"
  project_description    = "Markdown to Steam BBCode editor with live preview"
  environment_name       = "staging"
  infra_environment_name = "dev"
  assume_role_type       = var.buildserver ? "build_role_arn" : "admin_role_arn"

  tags = {
    Environment      = "staging"
    InfraEnvironment = "dev"
    Project          = "steam-bbcode"
  }
}

module "const" {
  source = "git@github.com:PlayOneMoreGame/terraform-modules//const?ref=v1.0.0"
}

module "locals" {
  source = "./modules/locals"
}

variable "buildserver" {
  description = "Whether or not the terraform run is happening on a build server."
  type        = bool
  default     = false
}

variable "use_assume_role" {
  description = "Whether or not to assume_role in AWS providers or just use current AWS login context."
  type        = bool
  default     = false
}
