/** 内置面板注册表，键对应 ConsolePanelDecl.builtin。 */

import type { WebUiPanel } from 'cortico/web/shared/client-panel.ts';
import { llmSettingsPanel } from './builtins/llm-settings/panel.ts';

export type BuiltinPanels = Readonly<Record<string, WebUiPanel>>;

export const BUILTIN_PANELS: BuiltinPanels = {
  'llm-settings': llmSettingsPanel,
};
