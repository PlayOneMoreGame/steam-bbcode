# Adding Studios to SteamBBEditor

Each studio gets its own workspace: blocked words, Do Not Translate (DNT) terms and localization targets. Workspaces are plain JSON files that the app discovers at build time through `import.meta.glob`, so adding one needs no code changes.

## Directory structure

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

Add `"default": true` to the one studio that should be selected when the user has no saved preference.

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

- **dntTerms**: Game-specific terms that should never be translated (character names, item names, etc.)
- **blockedWords**: Terms that trigger warnings in content (profanity, slurs, compliance terms)
- **localizationTargets**: Which languages appear in the translation dropdown

## Adding a second title to an existing studio

Create another JSON file in the studio's `titles/` directory. It appears in the studio's title dropdown after the next build.

## Workspace selection

The app selects the workspace in this priority order:

1. **localStorage**: the studio/title the user picked in Settings
2. **Cookie**: a `steambb-studio` cookie holding a studio slug, if your hosting sets one (for example after per-studio sign-in)
3. **Default**: the studio marked with `"default": true` in its studio.json

## Removing a studio

Delete its directory under `src/workspace/studios/` and rebuild.
