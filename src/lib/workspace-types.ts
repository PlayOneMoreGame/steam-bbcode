/**
 * Workspace configuration types for multi-studio, multi-title support.
 *
 * Hierarchy: Studio -> Title -> User (teams/users is a future tier)
 * Example:   One More Game -> SWAPMEAT -> Jeff
 *            Best Mega Gameco -> Mega Wedgie 3D -> (their team)
 */

export interface StudioConfig {
  slug: string;
  displayName: string;
  /** If true, this studio is selected by default when no user preference is stored. */
  default?: boolean;
}

export interface TitleConfig {
  slug: string;
  displayName: string;
  studioSlug: string;
  dntTerms: string[];
  blockedWords: string[];
  localizationTargets: string[];
}

export interface WorkspaceConfig {
  studio: StudioConfig;
  title: TitleConfig;
}

/** Selection state persisted in localStorage */
export interface WorkspaceSelection {
  studioSlug: string;
  titleSlug: string;
}
