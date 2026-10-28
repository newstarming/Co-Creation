import type { en } from './strings.ts';

export const S: Partial<typeof en> = {
  go: 'Continuar con ChatGPT',
  quota: 'Las solicitudes cuentan para el plan de ChatGPT de la cuenta; vigila su cuota.',
  waiting: 'Termina de iniciar sesión en el navegador…',
  signedIn: (email: string) => `Sesión iniciada: ${email}`,
  signedOut: 'Sin sesión',
  signOut: 'Cerrar sesión',
  failed: (why: string) => `No se pudo iniciar sesión: ${why}`,
  saveFirst: 'Guarda la conexión para iniciar sesión',
};
