import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Weiter mit ChatGPT',
  quota: 'Anfragen zählen zum ChatGPT-Tarif des Kontos; behalte das Kontingent im Blick.',
  waiting: 'Anmeldung im Browser abschließen…',
  signedIn: (email: string) => `Angemeldet: ${email}`,
  signedOut: 'Nicht angemeldet',
  signOut: 'Abmelden',
  failed: (why: string) => `Anmeldung fehlgeschlagen: ${why}`,
  saveFirst: 'Zum Anmelden zuerst speichern',
};
