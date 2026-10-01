import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// The Claude preview hands out a free port through PORT; plain `npm run dev` keeps Vite's default.
// (Read through globalThis because the project has no Node type definitions.)
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
const port = Number(env?.PORT) || undefined;

export default defineConfig({
  define: {
    // Full semver from package.json, e.g. "0.1.0". The HUD shortens it to "v0.1".
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { port },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
