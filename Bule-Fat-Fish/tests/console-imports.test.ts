/**
 * The settings window (console/, and the desktop-pet World's panels it loads) depends on Core only
 * through the WebUI HTTP API: it imports no module of Cortico's WebUI (`src/web/client/`), and from
 * Cortico it takes types only (the panel contract and the shapes of the API's replies), which leave no
 * code in the bundle.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONSOLE = join(ROOT, 'console');
const PET_PANELS = join(ROOT, 'packages', 'cortico-world-desktop-pet', 'src', 'webui');
const CORTICO_SRC = join(ROOT, 'vendor', 'cortico', 'src');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(e.name) ? [path] : [];
  });
}

interface Import { file: string; spec: string; typeOnly: boolean }

/** Every static import and re-export and every dynamic `import()` of a file, a template's fixed start included. */
function importsOf(file: string): Import[] {
  const text = readFileSync(file, 'utf8');
  const found: Import[] = [];
  for (const m of text.matchAll(/^\s*(import|export)\s+(type\s+)?[^'";()=]*?\sfrom\s+['"]([^'"]+)['"]/gm)) {
    found.push({ file, spec: m[3]!, typeOnly: !!m[2] });
  }
  for (const m of text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) found.push({ file, spec: m[1]!, typeOnly: false });
  for (const m of text.matchAll(/\bimport\(\s*(['"`])([^'"`$]+)(?:\1|\$\{)/g)) found.push({ file, spec: m[2]!, typeOnly: false });
  return found;
}

/** Where an import lands under vendor/cortico/src, or null when it does not. */
function corticoPath(imp: Import): string | null {
  const target = imp.spec.startsWith('cortico/') ? join(CORTICO_SRC, imp.spec.slice('cortico/'.length))
    : imp.spec.startsWith('.') ? resolve(dirname(imp.file), imp.spec)
    : null;
  return target && target.startsWith(CORTICO_SRC + sep) ? relative(CORTICO_SRC, target).split(sep).join('/') : null;
}

const imports = [...sources(CONSOLE), ...sources(PET_PANELS)].flatMap(importsOf);
const show = (imp: Import) => `${relative(ROOT, imp.file)}: ${imp.spec}`;

describe('the settings window and Cortico', () => {
  it('imports no module of Cortico\'s WebUI', () => {
    expect(imports.filter((imp) => corticoPath(imp)?.startsWith('web/client/')).map(show)).toEqual([]);
  });

  it('takes types only from Cortico', () => {
    const fromCortico = imports.filter((imp) => corticoPath(imp) !== null);
    // the panel contract's types are among them: a scan that finds none has stopped reading the imports
    expect(fromCortico.map((imp) => imp.spec)).toContain('cortico/web/shared/client-panel.ts');
    expect(fromCortico.filter((imp) => !imp.typeOnly).map(show)).toEqual([]);
  });
});
