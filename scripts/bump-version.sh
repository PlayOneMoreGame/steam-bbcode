#!/bin/bash
# Version bump script for SteamBBEditor
# Reads current version, prompts for bump type, updates all files, commits and tags

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${YELLOW}Current version: ${GREEN}v${CURRENT_VERSION}${NC}"
echo ""

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate next versions
NEXT_PATCH="$MAJOR.$MINOR.$((PATCH + 1))"
NEXT_MINOR="$MAJOR.$((MINOR + 1)).0"
NEXT_MAJOR="$((MAJOR + 1)).0.0"

echo "What type of release?"
echo "  [1] Patch  → v${NEXT_PATCH} (bug fixes, small changes) [default]"
echo "  [2] Minor  → v${NEXT_MINOR} (new features, backwards compatible)"
echo "  [3] Major  → v${NEXT_MAJOR} (breaking changes)"
echo "  [4] Cancel"
echo ""
read -p "Select [1-4]: " -n 1 -r CHOICE
echo ""

# Default to patch if just Enter pressed
if [[ -z "$CHOICE" || "$CHOICE" == "1" ]]; then
    NEW_VERSION="$NEXT_PATCH"
elif [[ "$CHOICE" == "2" ]]; then
    NEW_VERSION="$NEXT_MINOR"
elif [[ "$CHOICE" == "3" ]]; then
    NEW_VERSION="$NEXT_MAJOR"
else
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "Bumping ${GREEN}v${CURRENT_VERSION}${NC} → ${GREEN}v${NEW_VERSION}${NC}"
echo ""

# Confirm
read -p "Continue? [Y/n]: " -n 1 -r CONFIRM
echo ""
if [[ -n "$CONFIRM" && ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

# Update package.json
echo "Updating package.json..."
npm version "$NEW_VERSION" --no-git-tag-version

# Update Cargo.toml
echo "Updating src-tauri/Cargo.toml..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
else
    # Linux
    sed -i "s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
fi

# Update tauri.conf.json
echo "Updating src-tauri/tauri.conf.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
else
    sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
fi

# Git operations
echo ""
echo "Git operations..."

# Check for uncommitted changes beyond version files
CHANGED_FILES=$(git status --porcelain | grep -v package.json | grep -v Cargo.toml | grep -v tauri.conf.json | grep -v package-lock.json || true)
if [[ -n "$CHANGED_FILES" ]]; then
    echo -e "${YELLOW}Warning: You have other uncommitted changes:${NC}"
    echo "$CHANGED_FILES"
    echo ""
    read -p "Include all changes in version commit? [Y/n]: " -n 1 -r INCLUDE
    echo ""
    if [[ -n "$INCLUDE" && ! "$INCLUDE" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Commit your changes first, then run this script again.${NC}"
        exit 1
    fi
fi

git add .
git commit -m "v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

echo ""
read -p "Push to origin? [Y/n]: " -n 1 -r PUSH
echo ""
if [[ -z "$PUSH" || "$PUSH" =~ ^[Yy]$ ]]; then
    git push
    git push origin "v${NEW_VERSION}"
    echo ""
    echo -e "${GREEN}✓ v${NEW_VERSION} pushed! GitHub Actions will build the release.${NC}"
else
    echo ""
    echo -e "${YELLOW}Tagged locally. Run 'git push && git push origin v${NEW_VERSION}' when ready.${NC}"
fi
