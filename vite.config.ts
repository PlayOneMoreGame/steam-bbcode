import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, cpSync, readdirSync, statSync } from 'fs';

/**
 * Vite plugin: copies an external workspace directory into src/workspace/studios/
 * when the WORKSPACE_DIR env var is set.
 *
 * Usage:
 *   WORKSPACE_DIR=/path/to/my-studio npm run build
 *
 * The directory should contain studio.json and a titles/ subdirectory:
 *   my-studio/
 *     studio.json
 *     titles/
 *       my-game.json
 *
 * Multiple studios can be provided if WORKSPACE_DIR points to a parent directory
 * containing multiple studio folders (each with a studio.json).
 */
function copyWorkspaceDir(): Plugin {
  return {
    name: 'copy-workspace-dir',
    // Run before other plugins resolve imports
    enforce: 'pre',
    buildStart() {
      const workspaceDir = process.env.WORKSPACE_DIR;
      if (!workspaceDir) return;

      const absWorkspaceDir = resolve(workspaceDir);
      if (!existsSync(absWorkspaceDir)) {
        this.error(`WORKSPACE_DIR does not exist: ${absWorkspaceDir}`);
        return;
      }

      const destBase = resolve(__dirname, 'src/workspace/studios');

      // Determine if this is a single studio dir or a parent of multiple studios.
      // A single studio has a studio.json at its root.
      const hasStudioJson = existsSync(resolve(absWorkspaceDir, 'studio.json'));

      if (hasStudioJson) {
        // Single studio directory — copy it using its folder name as the slug
        const slug = absWorkspaceDir.split('/').pop()!;
        const dest = resolve(destBase, slug);
        cpSync(absWorkspaceDir, dest, { recursive: true });
        console.log(`[copy-workspace-dir] Copied studio "${slug}" from ${absWorkspaceDir}`);
      } else {
        // Parent directory containing multiple studio folders
        const entries = readdirSync(absWorkspaceDir);
        let copied = 0;
        for (const entry of entries) {
          const entryPath = resolve(absWorkspaceDir, entry);
          if (statSync(entryPath).isDirectory() && existsSync(resolve(entryPath, 'studio.json'))) {
            const dest = resolve(destBase, entry);
            cpSync(entryPath, dest, { recursive: true });
            copied++;
            console.log(`[copy-workspace-dir] Copied studio "${entry}" from ${entryPath}`);
          }
        }
        if (copied === 0) {
          this.warn(
            `WORKSPACE_DIR (${absWorkspaceDir}) contains no studio directories. ` +
            'Expected either a studio.json in the root, or subdirectories each containing studio.json.'
          );
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [copyWorkspaceDir(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Tauri expects a fixed port
  server: {
    port: 3000,
    strictPort: true,
    open: !process.env.TAURI_PLATFORM, // Don't open browser when running in Tauri
  },
  // Tauri uses this for production builds
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Tauri supports ES2021
    target: process.env.TAURI_PLATFORM ? 'es2021' : 'modules',
    // Reduce chunk warnings
    chunkSizeWarningLimit: 1000,
  },
  // Prevent Vite from clearing terminal with Tauri output
  clearScreen: false,
});
