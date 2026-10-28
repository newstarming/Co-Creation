import { pick } from '../../base/language.ts';
import { S as zhHant } from './strings.zh-Hant.ts';
import { S as ja } from './strings.ja.ts';
import { S as ko } from './strings.ko.ts';
import { S as fr } from './strings.fr.ts';
import { S as de } from './strings.de.ts';
import { S as es419 } from './strings.es-419.ts';
import { S as ptBR } from './strings.pt-BR.ts';
import { S as it } from './strings.it.ts';
import { S as ru } from './strings.ru.ts';

/** The ChatGPT plan's sign-in: the button (OpenAI's own label), the quota note and the account line. */
const zh = {
  go: '使用 ChatGPT 继续',
  quota: '请求计入该账号的 ChatGPT 套餐用量，请自行留意额度。',
  waiting: '请在浏览器中完成登录…',
  signedIn: (email: string) => `已登录：${email}`,
  signedOut: '未登录',
  signOut: '退出登录',
  failed: (why: string) => `登录失败：${why}`,
  saveFirst: '保存后才能登录',
};

export const en: typeof zh = {
  go: 'Continue with ChatGPT',
  quota: "Requests count toward the account's ChatGPT plan; keep an eye on its quota.",
  waiting: 'Finish signing in in the browser…',
  signedIn: (email: string) => `Signed in: ${email}`,
  signedOut: 'Not signed in',
  signOut: 'Sign out',
  failed: (why: string) => `Sign-in failed: ${why}`,
  saveFirst: 'Save the connection to sign in',
};

export const S = pick({
  zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es419, 'pt-BR': ptBR, it, ru,
});
