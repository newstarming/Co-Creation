import { beforeEach, describe, expect, it, vi } from 'vitest';

// Model the CG event state at the native boundary, without posting into the user's apps.
const native = vi.hoisted(() => ({
  flags: 0n,
  events: [] as Array<{ code: number; down: boolean; flags: bigint; text?: string }>,
}));
vi.mock('koffi', () => ({ default: {
  struct: (name: string) => name,
  load: () => ({ func: (signature: string) => {
    const name = signature.match(/(\w+)\(/)![1];
    switch (name) {
      case 'CGPreflightPostEventAccess': return () => true;
      case 'CGEventCreateKeyboardEvent': return (_: unknown, code: number, down: boolean) => ({ code, down, flags: native.flags });
      case 'CGEventSetFlags': return (ev: { flags: bigint }, flags: bigint) => { ev.flags = flags; };
      case 'CGEventKeyboardSetUnicodeString': return (ev: { text: string }, length: number, units: Uint16Array) => {
        ev.text = String.fromCharCode(...units.slice(0, length));
      };
      case 'CGEventPost': return (_: unknown, ev: typeof native.events[number]) => {
        native.flags = ev.flags;
        native.events.push({ ...ev });
      };
      default: return () => {};
    }
  } }),
} }));

import { chord, typeUnicode } from '../../src/cua/engine/darwin.ts';

beforeEach(() => { native.flags = 0n; native.events.length = 0; });

describe('macOS keyboard event state', () => {
  it('releases modifiers before subsequent text, including multi-modifier shortcuts', () => {
    chord([{ vk: 0x5b, extended: false }, { vk: 0x10, extended: false }, { vk: 0x41, extended: false }]);
    expect(native.events.map(e => e.flags)).toEqual([0x100000n, 0x120000n, 0x120000n, 0x120000n, 0x100000n, 0n]);
    typeUnicode('中文 test🙂');
    expect(native.events.filter(e => e.text && e.down).map(e => e.text).join('')).toBe('中文 test🙂');
    expect(native.events.filter(e => e.text).every(e => e.flags === 0n)).toBe(true);
  });

  it('does not inherit ambient Command/Option flags when typing text', () => {
    native.flags = 0x180000n;
    const text = '长文本中文🙂 English'.repeat(4);
    typeUnicode(text);
    // Chromium's native char-event path has a short character buffer.
    expect(native.events.filter(e => e.down).map(e => e.text?.slice(0, 4)).join('')).toBe(text);
    expect(native.events.every(e => e.flags === 0n)).toBe(true);
    expect(native.events.filter(e => e.down).map(e => e.text)).toEqual(native.events.filter(e => !e.down).map(e => e.text));
  });

  it('sends real Return keys for newlines and rejects unsupported chords before posting', () => {
    typeUnicode('a\r\nb');
    expect(native.events.filter(e => e.down).map(e => e.text ?? e.code)).toEqual(['a', 0x24, 'b']);
    native.events.length = 0;
    expect(() => chord([{ vk: 0x5b, extended: false }, { vk: 0xffff, extended: false }])).toThrow();
    expect(native.events).toEqual([]);
  });
});
