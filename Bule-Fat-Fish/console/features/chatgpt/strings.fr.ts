import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Continuer avec ChatGPT',
  quota: "Les requêtes sont décomptées de l'offre ChatGPT du compte ; surveillez son quota.",
  waiting: 'Terminez la connexion dans le navigateur…',
  signedIn: (email: string) => `Compte connecté : ${email}`,
  signedOut: 'Non connecté',
  signOut: 'Se déconnecter',
  failed: (why: string) => `Échec de la connexion : ${why}`,
  saveFirst: 'Enregistrez la connexion pour vous connecter',
};
