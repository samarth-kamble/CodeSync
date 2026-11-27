import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const EXTENSION_ROOT = resolve(__dirname, '..');

interface ManifestSchema {
  manifest_version: number;
  name: string;
  version: string;
  minimum_chrome_version?: string;
  icons: Record<string, string>;
  permissions: string[];
  host_permissions: string[];
}

describe('Chrome Web Store Manifest Compliance', () => {
  const manifestPath = resolve(EXTENSION_ROOT, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ManifestSchema;

  it('uses Manifest V3 and declares a minimum Chrome version', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toContain('CodeSync');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.minimum_chrome_version).toBeDefined();
  });

  it('enforces least-privilege permissions and avoids wildcard host permissions', () => {
    expect(manifest.permissions).toEqual(['storage', 'notifications', 'identity', 'alarms']);
    expect(manifest.host_permissions).not.toContain('<all_urls>');
    expect(manifest.host_permissions).not.toContain('*://*/*');
    expect(manifest.host_permissions).toContain('https://api.github.com/*');
    expect(manifest.host_permissions).toContain('https://leetcode.com/*');
    expect(manifest.host_permissions).toContain('https://*.geeksforgeeks.org/*');
    expect(manifest.host_permissions).toContain('https://practiceapi.geeksforgeeks.org/*');
  });

  it('includes valid PNG files for all declared icon sizes', () => {
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (const iconRelPath of Object.values(manifest.icons)) {
      const fullPath = resolve(EXTENSION_ROOT, 'public', iconRelPath);
      expect(existsSync(fullPath)).toBe(true);
      const bytes = readFileSync(fullPath);
      expect(bytes.length).toBeGreaterThan(100);
      expect(Array.from(bytes.subarray(0, 8))).toEqual(pngSignature);
    }
  });
});
