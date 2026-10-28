/**
 * Steps that work in a terminal, which the person grants on their own (cua.ts): typing or a key
 * while a terminal window is in front, and the Run box shortcut on Windows.
 */
import type { KeyCode } from './engine/keys.ts';

const WIN = 0x5B;
const R = 0x52;

/**
 * Terminals and shells by program name, lowercase and without `.exe`: what Windows and Linux report
 * for the process, the app name on macOS. Linux cuts a name at 15 characters (gnome-terminal-server).
 */
const TERMINALS = new Set([
  'cmd', 'powershell', 'powershell_ise', 'pwsh', 'windowsterminal', 'wt', 'conhost', 'openconsole', 'wsl', 'bash', 'mintty', 'putty',
  'terminal', 'iterm', 'iterm2', 'warp', 'ghostty', 'hyper', 'tabby', 'alacritty', 'kitty', 'wezterm', 'wezterm-gui',
  'gnome-terminal-', 'kgx', 'ptyxis', 'konsole', 'xterm', 'uxterm', 'urxvt', 'rxvt', 'st', 'foot', 'tilix', 'terminator',
  'xfce4-terminal', 'mate-terminal', 'lxterminal', 'qterminal', 'terminology', 'deepin-terminal', 'yakuake', 'guake',
]);

/** Whether the program `app` (ScreenInfo.foregroundApp) is a terminal or a shell. */
export function isTerminal(app: string | null | undefined): boolean {
  if (!app) return false;
  const name = app.toLowerCase().replace(/\.exe$/, '');
  return TERMINALS.has(name) || TERMINALS.has(name.slice(0, 15));
}

/** Whether `chords` press Win+R, which opens the Run box on Windows. */
export function opensRunBox(chords: KeyCode[][], platform: NodeJS.Platform): boolean {
  return platform === 'win32' && chords.some((c) => c.length === 2 && c.some((k) => k.vk === WIN) && c.some((k) => k.vk === R));
}
