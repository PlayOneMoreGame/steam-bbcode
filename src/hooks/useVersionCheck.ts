// Periodic version check for the web app.
// Fetches /version.json and compares against the build-time version.
// When a newer version is deployed, sets updateAvailable so the UI
// can show a non-intrusive reload banner.

import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface VersionCheckResult {
  /** The new version string, or null if no update is available */
  updateAvailable: string | null;
  /** Reload the page to pick up the new version */
  reload: () => void;
  /** Dismiss the banner until the next check finds a newer version */
  dismiss: () => void;
}

/**
 * Periodically checks /version.json against the current app version.
 * Only runs in the web app (skipped when isDesktop is true).
 */
export function useVersionCheck(isDesktop: boolean): VersionCheckResult {
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      // Cache-bust to avoid CloudFront serving stale version.json
      const res = await fetch(`/version.json?_=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== __APP_VERSION__) {
        setUpdateAvailable(data.version);
      }
    } catch {
      // Network error — silently ignore, will retry next interval
    }
  }, []);

  useEffect(() => {
    if (isDesktop) return;

    // Check on mount
    checkVersion();

    // Re-check every 30 minutes
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isDesktop, checkVersion]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    if (updateAvailable) {
      setDismissedVersion(updateAvailable);
    }
  }, [updateAvailable]);

  // If the user dismissed this specific version, hide it
  const effectiveUpdate =
    updateAvailable && updateAvailable !== dismissedVersion
      ? updateAvailable
      : null;

  return { updateAvailable: effectiveUpdate, reload, dismiss };
}
