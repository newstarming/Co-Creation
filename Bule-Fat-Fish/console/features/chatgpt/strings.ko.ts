import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'ChatGPT로 계속하기',
  quota: '요청은 해당 계정의 ChatGPT 요금제 사용량에 포함됩니다. 남은 한도를 직접 확인하세요.',
  waiting: '브라우저에서 로그인을 완료하세요…',
  signedIn: (email: string) => `로그인됨: ${email}`,
  signedOut: '로그인하지 않음',
  signOut: '로그아웃',
  failed: (why: string) => `로그인 실패: ${why}`,
  saveFirst: '저장한 후 로그인할 수 있습니다',
};
