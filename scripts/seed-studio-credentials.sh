#!/usr/bin/env bash
set -euo pipefail

# Seed the studio_credentials SSM parameter with initial studios.
# Run once to migrate from the old single basic_auth_key to per-studio credentials.
#
# Usage:
#   ./scripts/seed-studio-credentials.sh                    # generate random passwords
#   ./scripts/seed-studio-credentials.sh "omgpass" "bmgpass" # use specific passwords

AWS_PROFILE="${AWS_PROFILE:-dev}"
SSM_PARAM="/omg/staging/steam-bbcode/studio_credentials"

generate_password() {
  LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 12
}

echo "Seeding studio credentials for SteamBBEditor staging"
echo "AWS Profile: $AWS_PROFILE"
echo ""

# Use arguments if provided, otherwise generate random passwords
OMG_PASS="${1:-$(generate_password)}"
BMG_PASS="${2:-$(generate_password)}"

OMG_AUTH=$(printf '%s' "one-more-game:$OMG_PASS" | base64)
BMG_AUTH=$(printf '%s' "best-mega-gameco:$BMG_PASS" | base64)

CREDENTIALS=$(node -e "
  console.log(JSON.stringify({
    'one-more-game': process.argv[1],
    'best-mega-gameco': process.argv[2]
  }));
" "$OMG_AUTH" "$BMG_AUTH")

aws ssm put-parameter \
  --name "$SSM_PARAM" \
  --value "$CREDENTIALS" \
  --type SecureString \
  --overwrite \
  --profile "$AWS_PROFILE" \
  --no-cli-pager

echo ""
echo "SSM parameter created: $SSM_PARAM"
echo ""
echo "Studio credentials:"
echo "  one-more-game    / $OMG_PASS"
echo "  best-mega-gameco / $BMG_PASS"
echo ""
echo "Save these passwords — they won't be shown again."
echo ""
echo "Next: commit and push to deploy (CI runs terraform apply automatically)."
