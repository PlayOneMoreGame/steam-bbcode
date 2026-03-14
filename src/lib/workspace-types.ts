/**
 * Workspace configuration types for multi-title support (SMD-4413).
 *
 * Hierarchy: Studio -> Title -> Person
 * Example:   One More Game -> SWAPMEAT -> Jeff/Wonder
 */

export interface StudioConfig {
  studio: string;
  /** Org-wide compliance baseline. Optional; blocked-words-default.ts is the current source. */
  blockedWords?: string[];
}

export interface TitleConfig {
  title: string;
  dntTerms: string[];
  /** Title-specific blocked word additions on top of the studio baseline. */
  blockedWords?: string[];
  localizationTargets: string[];
}

export interface WorkspaceConfig {
  studio: StudioConfig;
  title: TitleConfig;
}
