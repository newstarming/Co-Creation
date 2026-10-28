import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'ChatGPT で続ける',
  quota: 'リクエストはそのアカウントの ChatGPT プランの利用量に含まれます。残りの枠はご自身で確認してください。',
  waiting: 'ブラウザでサインインを完了してください…',
  signedIn: (email: string) => `サインイン中：${email}`,
  signedOut: 'サインインしていません',
  signOut: 'サインアウト',
  failed: (why: string) => `サインインできませんでした：${why}`,
  saveFirst: '保存するとサインインできます',
};
