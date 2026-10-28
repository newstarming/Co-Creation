import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
interface DataRecord { data: string; program: string; startedAt: string }
const { readRecord, writeRecord, locateData, dataDirIn } = require('../app/data-dir.cjs') as {
  readRecord(file: string): DataRecord | null;
  writeRecord(file: string, record: DataRecord): void;
  locateData(at: { programDir: string; record: DataRecord | null }): { use: string } | { ask: 'inherit' | 'missing'; record: DataRecord };
  dataDirIn(folder: string): string | null;
};

let root = '';
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }); });

/** Two install folders on disk; `withData` lists the ones whose data\ holds a deployment. */
function installs(...withData: Array<'old' | 'new'>) {
  root = mkdtempSync(join(tmpdir(), 'coo-data-dir-'));
  const dir = { old: join(root, 'old'), new: join(root, 'new') };
  for (const name of ['old', 'new'] as const) {
    mkdirSync(dir[name]);
    if (withData.includes(name)) mkdirSync(join(dir[name], 'data', 'home'), { recursive: true });
  }
  const record = (data: string, program: string): DataRecord => ({ data, program, startedAt: '2026-10-16T09:18:40.000Z' });
  return { ...dir, record };
}

describe('the data directory of the installed Windows build', () => {
  it('uses the data beside the program whatever the record says, and beside the program when there is no record', () => {
    const at = installs('old', 'new');
    expect(locateData({ programDir: at.new, record: at.record(join(at.old, 'data'), at.old) })).toEqual({ use: join(at.new, 'data') });
    expect(locateData({ programDir: at.old, record: null })).toEqual({ use: join(at.old, 'data') });
  });

  it('asks before taking over the data another program directory used, and when that data is gone', () => {
    const at = installs('old');
    const record = at.record(join(at.old, 'data'), at.old);
    expect(locateData({ programDir: at.new, record })).toEqual({ ask: 'inherit', record });
    rmSync(join(at.old, 'data'), { recursive: true });
    expect(locateData({ programDir: at.new, record })).toEqual({ ask: 'missing', record });
  });

  it('uses the data a record bound to this program directory, a new one not yet seeded included, and asks once it is gone', () => {
    const at = installs('old');
    expect(locateData({ programDir: at.new.toUpperCase(), record: at.record(join(at.old, 'data'), at.new) })).toEqual({ use: join(at.old, 'data') });
    mkdirSync(join(at.new, 'data'));
    expect(locateData({ programDir: at.new, record: at.record(join(at.new, 'data'), at.new) })).toEqual({ use: join(at.new, 'data') });
    const gone = at.record(join(root, 'elsewhere', 'data'), at.new);
    expect(locateData({ programDir: at.new, record: gone })).toEqual({ ask: 'missing', record: gone });
  });

  it('takes a picked data folder or install folder, and nothing else', () => {
    const at = installs('old');
    expect(dataDirIn(join(at.old, 'data'))).toBe(join(at.old, 'data'));
    expect(dataDirIn(at.old)).toBe(join(at.old, 'data'));
    expect(dataDirIn(at.new)).toBeNull();
  });

  it('reads back what it wrote, and no record from a missing or foreign file', () => {
    const at = installs();
    const file = join(root, 'record', 'data-location.json');
    expect(readRecord(file)).toBeNull();
    const record = at.record(join(at.old, 'data'), at.old);
    writeRecord(file, record);
    expect(readRecord(file)).toEqual(record);
    writeFileSync(file, JSON.stringify({ data: 1 }));
    expect(readRecord(file)).toBeNull();
    writeFileSync(file, '{');
    expect(readRecord(file)).toBeNull();
  });
});
