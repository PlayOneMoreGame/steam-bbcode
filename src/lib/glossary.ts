/**
 * Terms that must NOT be translated or localized.
 * Used by the translation feature (SMD-4370) to instruct the LLM
 * to preserve these terms exactly as written.
 *
 * Includes: game title, character names, enemy names, difficulty modes,
 * game-specific proper nouns, and patterns like @mentions.
 */

export const DO_NOT_TRANSLATE: string[] = [
  // Game title
  'SWAPMEAT',

  // Characters / Skins
  'Tangus',
  'Jangus',
  'Smart Meat',
  'Gobble Gazer',
  'Paper Bobby',
  'Boombot',
  'BoxFace',
  'Rocketbot',
  'Rangus',
  'Franken Meat',
  'Franken Beans',
  'Squat Daddy',
  'Coach Dan',
  'Dingus',
  'Micro Jackson',
  'Highbeam',
  'Zorpjet',

  // Enemies / NPCs
  'Pestie',
  'Peeperoni',
  'Bean Minion',
  'Wheelie',
  'Creeper',
  'Katana',
  'Clobberbot',

  // Items / Mechanics
  'Plasma',
  'Slime',

  // Difficulty modes
  'Hard',
  'Standard',
  'Casual',
  'Nightmare',

  // Game modes / Map names
  'Random Solar System',
];

/**
 * Regex patterns for terms that should not be translated.
 * These are checked dynamically against the source text.
 */
export const DO_NOT_TRANSLATE_PATTERNS: RegExp[] = [
  // @mentions (e.g., @cloudkicker76)
  /@\w+/g,
];
