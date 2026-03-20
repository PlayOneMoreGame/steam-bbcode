#!/usr/bin/env bash
set -euo pipefail

# Add a new studio to SteamBBEditor
# Creates workspace JSON files and writes credentials to SSM
#
# Usage:
#   ./scripts/add-studio.sh "Studio Name" "Game Title"
#   ./scripts/add-studio.sh "Acme Games" "Rocket Blaster"
#
# After running:
#   1. Commit the new studio files
#   2. Push to main (CI deploys automatically — builds SPA + terraform apply)
#   3. Send the credentials to the studio contact

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STUDIOS_DIR="$ROOT_DIR/src/workspace/studios"
AWS_PROFILE="${AWS_PROFILE:-dev}"
SSM_PARAM="/omg/staging/steam-bbcode/studio_credentials"

#######################################
# Helpers
#######################################

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

generate_password() {
  # 12-char alphanumeric password
  LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 12
}

#######################################
# Validate args
#######################################

if [ $# -lt 2 ]; then
  echo "Usage: $0 \"Studio Name\" \"Title Name\""
  echo ""
  echo "Examples:"
  echo "  $0 \"Acme Games\" \"Rocket Blaster\""
  echo "  $0 \"Indie Dev Co\" \"Space Rogues\""
  exit 1
fi

STUDIO_NAME="$1"
TITLE_NAME="$2"
STUDIO_SLUG=$(slugify "$STUDIO_NAME")
TITLE_SLUG=$(slugify "$TITLE_NAME")

if [ -d "$STUDIOS_DIR/$STUDIO_SLUG" ]; then
  echo "Error: Studio directory already exists: $STUDIOS_DIR/$STUDIO_SLUG"
  exit 1
fi

echo ""
echo "Creating studio: $STUDIO_NAME ($STUDIO_SLUG)"
echo "  Title: $TITLE_NAME ($TITLE_SLUG)"
echo ""

#######################################
# Generate credentials
#######################################

PASSWORD=$(generate_password)
AUTH_STRING="$STUDIO_SLUG:$PASSWORD"
AUTH_BASE64=$(echo -n "$AUTH_STRING" | base64)

#######################################
# Create studio JSON files
#######################################

mkdir -p "$STUDIOS_DIR/$STUDIO_SLUG/titles"

cat > "$STUDIOS_DIR/$STUDIO_SLUG/studio.json" <<EOF
{
  "slug": "$STUDIO_SLUG",
  "displayName": "$STUDIO_NAME"
}
EOF

cat > "$STUDIOS_DIR/$STUDIO_SLUG/titles/$TITLE_SLUG.json" <<EOF
{
  "slug": "$TITLE_SLUG",
  "displayName": "$TITLE_NAME",
  "studioSlug": "$STUDIO_SLUG",
  "dntTerms": ["$TITLE_NAME"],
  "blockedWords": [],
  "localizationTargets": ["pt-BR", "es-LATAM", "ko", "zh-Hans", "ja", "de", "fr"]
}
EOF

echo "Created: $STUDIOS_DIR/$STUDIO_SLUG/studio.json"
echo "Created: $STUDIOS_DIR/$STUDIO_SLUG/titles/$TITLE_SLUG.json"

#######################################
# Update SSM credentials
#######################################

echo ""
echo "Updating SSM credentials (profile: $AWS_PROFILE)..."

# Read existing credentials (or start fresh)
EXISTING=$(aws ssm get-parameter \
  --name "$SSM_PARAM" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --profile "$AWS_PROFILE" 2>/dev/null || echo "{}")

# Add the new studio credential using node (jq-like but always available)
UPDATED=$(node -e "
  const existing = JSON.parse(process.argv[1]);
  existing['$STUDIO_SLUG'] = '$AUTH_BASE64';
  console.log(JSON.stringify(existing));
" "$EXISTING")

aws ssm put-parameter \
  --name "$SSM_PARAM" \
  --value "$UPDATED" \
  --type SecureString \
  --overwrite \
  --profile "$AWS_PROFILE" \
  --no-cli-pager

echo "SSM parameter updated: $SSM_PARAM"

#######################################
# Output
#######################################

echo ""
echo "========================================================"
echo ""
echo "  Studio created! Send this to your contact:"
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  SteamBBEditor — $STUDIO_NAME"
echo "  │"
echo "  │  URL:      https://staging-steam-bbcode.dev.onemoregame.live"
echo "  │  Username: $STUDIO_SLUG"
echo "  │  Password: $PASSWORD"
echo "  │"
echo "  │  Open the URL, enter your credentials,"
echo "  │  and you're in. Your workspace is pre-selected."
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  Next steps:"
echo "    1. git add src/workspace/studios/$STUDIO_SLUG"
echo "    2. git commit -m 'feat: add $STUDIO_NAME studio'"
echo "    3. git push (CI deploys automatically)"
echo ""
echo "========================================================"
echo ""
