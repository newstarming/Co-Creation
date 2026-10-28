import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: '使用 ChatGPT 繼續',
  quota: '請求計入該帳號的 ChatGPT 方案用量，請自行留意額度。',
  waiting: '請在瀏覽器中完成登入…',
  signedIn: (email: string) => `已登入：${email}`,
  signedOut: '未登入',
  signOut: '登出',
  failed: (why: string) => `登入失敗：${why}`,
  saveFirst: '儲存後才能登入',
};
