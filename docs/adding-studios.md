# Adding Studios to SteamBBEditor

This guide covers how to add a new game studio to SteamBBEditor so they can use the tool with their own workspace (blocked words, DNT terms, localization targets).

## Quick Start (5 minutes)

### Prerequisites

- AWS CLI configured with the `dev` profile (`aws sso login --profile dev`)
- Node.js installed (for the script's JSON manipulation)
- Write access to this repo

### Add a Studio

```bash
npm run add-studio "Studio Name" "Game Title"
```

Example:

```bash
npm run add-studio "Acme Games" "Rocket Blaster"
```

This does three things:
1. Creates the studio and title JSON config files in `src/workspace/studios/`
2. Generates a random password and writes the credential to AWS SSM
3. Prints the credentials to send to the studio

### Deploy

```bash
git add src/workspace/studios/acme-games
git commit -m "feat: add Acme Games studio"
git push
```

CI handles the rest — Buildkite builds the SPA, runs `terraform apply` to update the CloudFront auth function, syncs to S3, and invalidates the cache.

### Send Credentials

The script outputs a message you can paste directly into Slack or email:

```
URL:      https://staging-steam-bbcode.dev.onemoregame.live
Username: acme-games
Password: REDACTED
```

The studio logs in with these credentials. The `steambb-studio` cookie auto-selects their workspace — they don't need to pick their studio in Settings.

## What Gets Created

### Directory Structure

```
src/workspace/studios/acme-games/
  studio.json              # Studio metadata
  titles/
    rocket-blaster.json    # Title config (DNT terms, blocked words, languages)
```

### studio.json

```json
{
  "slug": "acme-games",
  "displayName": "Acme Games"
}
```

### Title JSON

```json
{
  "slug": "rocket-blaster",
  "displayName": "Rocket Blaster",
  "studioSlug": "acme-games",
  "dntTerms": ["Rocket Blaster"],
  "blockedWords": [],
  "localizationTargets": ["pt-BR", "es-LATAM", "ko", "zh-Hans", "ja", "de", "fr"]
}
```

The studio can customize these later:
- **dntTerms**: Game-specific terms that should never be translated (character names, item names, etc.)
- **blockedWords**: Terms that trigger warnings in content (profanity, slurs, compliance terms)
- **localizationTargets**: Which languages appear in the translation dropdown

## Adding a Second Title to an Existing Studio

Create a new JSON file in the studio's `titles/` directory:

```bash
cat > src/workspace/studios/acme-games/titles/space-rogues.json << 'EOF'
{
  "slug": "space-rogues",
  "displayName": "Space Rogues",
  "studioSlug": "acme-games",
  "dntTerms": ["Space Rogues", "Captain Nova", "The Nebula"],
  "blockedWords": [],
  "localizationTargets": ["pt-BR", "es-LATAM", "ko", "zh-Hans", "ja"]
}
EOF
```

Commit, push, and CI deploys. The title appears in the studio's title dropdown automatically (via `import.meta.glob` auto-discovery — no code changes needed).

## How Auth Works

### Per-Studio Basic Auth

Each studio has its own basic auth credential:
- **Username** = studio slug (e.g., `acme-games`)
- **Password** = randomly generated

Credentials are stored in AWS SSM as a single JSON parameter:
```
/omg/staging/steam-bbcode/studio_credentials
→ {"one-more-game":"base64...", "best-mega-gameco":"base64...", "acme-games":"base64..."}
```

### CloudFront Function

The viewer-request CloudFront function:
1. Checks the `Authorization` header against all known studio credentials
2. Extracts the studio slug from the matching credential
3. Sets a `steambb-studio` cookie via a one-time 302 redirect
4. Subsequent requests pass through directly (cookie is already set)

### SPA Workspace Selection

The app selects the workspace in this priority order:
1. **localStorage** — if the user has explicitly selected a studio/title in Settings
2. **Cookie** — the `steambb-studio` cookie set by CloudFront auth
3. **Default** — the studio marked with `"default": true` in its studio.json

## Resetting a Studio's Password

```bash
# Generate a new password
NEW_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 12)
SLUG="acme-games"
AUTH_BASE64=$(echo -n "$SLUG:$NEW_PASS" | base64)

# Read existing credentials, update, write back
EXISTING=$(aws ssm get-parameter --name "/omg/staging/steam-bbcode/studio_credentials" \
  --with-decryption --query "Parameter.Value" --output text --profile dev)

UPDATED=$(node -e "
  const creds = JSON.parse(process.argv[1]);
  creds['$SLUG'] = '$AUTH_BASE64';
  console.log(JSON.stringify(creds));
" "$EXISTING")

aws ssm put-parameter --name "/omg/staging/steam-bbcode/studio_credentials" \
  --value "$UPDATED" --type SecureString --overwrite --profile dev --no-cli-pager

echo "New password for $SLUG: $NEW_PASS"
```

Then `make tf-staging-apply` to update the CloudFront function, or push to main and let CI handle it.

## Initial Setup (One-Time)

If setting up per-studio auth for the first time (migrating from the old single-credential system):

```bash
./scripts/seed-studio-credentials.sh
```

This prompts for passwords for the existing studios (One More Game, Best Mega Gameco) and creates the SSM parameter. Then deploy to update the CloudFront function.

## Removing a Studio

1. Delete the studio directory: `rm -rf src/workspace/studios/acme-games`
2. Remove the credential from SSM:
   ```bash
   EXISTING=$(aws ssm get-parameter --name "/omg/staging/steam-bbcode/studio_credentials" \
     --with-decryption --query "Parameter.Value" --output text --profile dev)
   UPDATED=$(node -e "const c = JSON.parse(process.argv[1]); delete c['acme-games']; console.log(JSON.stringify(c));" "$EXISTING")
   aws ssm put-parameter --name "/omg/staging/steam-bbcode/studio_credentials" \
     --value "$UPDATED" --type SecureString --overwrite --profile dev --no-cli-pager
   ```
3. Commit, push, deploy.
