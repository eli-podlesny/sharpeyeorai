declare const __APP_VERSION__: string;

/** Full version from package.json, injected at build time. */
export const APP_VERSION: string = __APP_VERSION__;

/** "0.1.0" → "v0.1" (the patch number is not shown in the HUD). */
export function formatVersionLabel(version: string): string {
  const [major = '0', minor = '0'] = version.split('.');
  return `v${major}.${minor}`;
}
