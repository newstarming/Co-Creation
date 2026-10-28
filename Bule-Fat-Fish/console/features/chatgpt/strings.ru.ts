import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Продолжить с ChatGPT',
  quota: 'Запросы учитываются в тарифе ChatGPT этого аккаунта; следите за остатком лимита.',
  waiting: 'Завершите вход в браузере…',
  signedIn: (email: string) => `Вход выполнен: ${email}`,
  signedOut: 'Вход не выполнен',
  signOut: 'Выйти',
  failed: (why: string) => `Войти не получилось: ${why}`,
  saveFirst: 'Сохраните подключение, чтобы войти',
};
