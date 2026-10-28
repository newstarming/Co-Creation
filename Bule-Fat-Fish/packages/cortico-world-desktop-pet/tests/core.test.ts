/**
 * Through Cortico Core: typed text on the pet page wakes the bot, the scripted model answers
 * with pet_say and pet_ask, the page receives both, and the answer comes back as the next
 * event in the model's context.
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { Bot } from 'cortico/bot.ts';
import type { CoreConfig } from 'cortico/core/types.ts';
import { DESKTOP_PET_DEFAULTS } from '../src/config.ts';
import { DESKTOP_PET } from '../src/definition.ts';
import type { DesktopPetWorld } from '../src/world.ts';
import { ScriptedModel, startBot } from './helpers/harness.ts';
import { FakePage } from './helpers/page.ts';

let bot: Bot<CoreConfig> | null = null;
let page: FakePage | null = null;
afterAll(async () => {
  await page?.close();
  await bot?.stop();
});

describe('desktop pet through Core', () => {
  it('a typed line wakes the bot; its bubble and question reach the page; the answer comes back', async () => {
    const model = new ScriptedModel((turn) => {
      const seen = JSON.stringify(turn.records);
      if (turn.n === 0) {
        expect(seen).toContain('[typed] 伙伴:在吗');
        return { calls: [
          { name: 'pet_say', args: { script: '【开心】在呢!' } },
          { name: 'pet_ask', args: { question: '想做什么?', options: ['聊天', '休息'] } },
        ] };
      }
      if (seen.includes('[answer]')) return { calls: [{ name: 'end_turn' }] };
      return { calls: [{ name: 'end_turn' }] };
    });
    bot = await startBot({
      worlds: [DESKTOP_PET as never],
      sections: { 'desktop-pet': { port: 0, window: { enabled: false, electronFile: '', scale: 1 }, asr: { ...(DESKTOP_PET.defaults() as { asr: object }).asr, enabled: false, mic: { ...DESKTOP_PET_DEFAULTS.asr.mic, mode: 'always' } } } },
      model,
    });
    const world = bot.assembly.mounted.find((w) => w.id === 'desktop-pet') as unknown as DesktopPetWorld;
    page = await FakePage.open(world.petUrl.replace(/\/pet$/, ''));
    page.send({ t: 'text', text: '在吗' });

    const say = await page.next((m) => m.t === 'say', 20_000);
    expect(say.beats).toEqual([{ actions: ['happy'], text: '在呢!', anchors: [] }]);
    const ask = await page.next((m) => m.t === 'ask', 20_000);
    expect(ask.options).toEqual(['聊天', '休息']);

    page.send({ t: 'answer', askId: ask.id, index: 1 });
    await expect.poll(() => model.turns.some((t) => JSON.stringify(t.records).includes('[answer] 伙伴回答「想做什么?」:选了第 2 项「休息」')), { timeout: 20_000 }).toBe(true);
  });
});
