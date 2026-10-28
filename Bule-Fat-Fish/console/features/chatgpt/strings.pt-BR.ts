import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Continuar com o ChatGPT',
  quota: 'As solicitações contam no plano do ChatGPT da conta; fique de olho na cota.',
  waiting: 'Termine o login no navegador…',
  signedIn: (email: string) => `Conta conectada: ${email}`,
  signedOut: 'Sem login',
  signOut: 'Sair',
  failed: (why: string) => `Falha no login: ${why}`,
  saveFirst: 'Salve a conexão para entrar',
};
