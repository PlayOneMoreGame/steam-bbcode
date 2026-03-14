/**
 * Workspace configuration loader (SMD-4413).
 *
 * Imports studio and title configs statically at build time,
 * following the same pattern as dnt-defaults.json.
 */

import type { StudioConfig, TitleConfig, WorkspaceConfig } from './workspace-types';
import studioJson from '@/workspace/studio.json';
import swapmeatJson from '@/workspace/titles/swapmeat.json';

export const studioConfig: StudioConfig = studioJson;

const titleConfigs: Record<string, TitleConfig> = {
  SWAPMEAT: swapmeatJson as TitleConfig,
};

/** Default title used when no selection has been made. */
const DEFAULT_TITLE = 'SWAPMEAT';

/** Returns the full workspace config (studio + active title). */
export function getWorkspaceConfig(title: string = DEFAULT_TITLE): WorkspaceConfig {
  const titleConfig = titleConfigs[title];
  if (!titleConfig) {
    throw new Error(`Unknown title: "${title}". Available: ${getAvailableTitles().join(', ')}`);
  }
  return {
    studio: studioConfig,
    title: titleConfig,
  };
}

/** Returns the list of available title keys. */
export function getAvailableTitles(): string[] {
  return Object.keys(titleConfigs);
}
