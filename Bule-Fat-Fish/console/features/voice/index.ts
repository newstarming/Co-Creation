/**
 * 「语音输入」: the desktop-pet World's own `voice` panel (switch, talk key, microphone, level
 * meter, what it heard), mounted on its own without the World page around it, so the normal mode
 * reaches it without the World tree.
 */
import type { Page, PageContext } from '../../base/page.ts';
import { intro } from '../intro.ts';
import { S } from './strings.ts';

const PET_PAGE = 'world:desktop-pet';

async function mount(ctx: PageContext): Promise<void> {
  const { ui, root } = ctx;
  root.classList.add('home');
  // the panel's own first card is titled like the page: companion.css hides that heading
  root.append(intro(ui, S.nav));
  const box = ui.h('div', 'companion-voicebox');
  root.append(box);
  ctx.lifecycle.own(await ctx.mountPanel(PET_PAGE, 'voice', box));
}

export const voicePage: Page = {
  route: 'voice',
  label: S.nav,
  icon: 'activity',
  mount,
};
