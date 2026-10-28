import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Continua con ChatGPT',
  quota: "Le richieste rientrano nel piano ChatGPT dell'account; tieni d'occhio la quota.",
  waiting: "Completa l'accesso nel browser…",
  signedIn: (email: string) => `Accesso effettuato: ${email}`,
  signedOut: 'Accesso non effettuato',
  signOut: 'Esci',
  failed: (why: string) => `Accesso non riuscito: ${why}`,
  saveFirst: 'Salva la connessione per accedere',
};
