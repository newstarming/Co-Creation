import { describe, expect, it } from 'vitest';
import { noteStep } from '../core/guide.ts';

describe('noteStep', () => {
  it('records that a key was typed in, never the key', () => {
    const lines = noteStep(
      { text: '把 API Key 贴在这里吧。', input: { kind: 'text', submit: '连接', secret: true } },
      { text: 'sk-0123456789abcdef' },
    );
    expect(lines.join('\n')).not.toContain('sk-0123456789abcdef');
  });
});
