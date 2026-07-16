import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crée et initialise un client Supabase destiné à être exécuté côté serveur (API, Server Components).
 * Utilise la gestion asynchrone des cookies de Next.js.
 */
export async function creerClient() {
  const stockageCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      cookies: {
        getAll() {
          return stockageCookies.getAll();
        },
        setAll(cookiesAEnregistrer) {
          try {
            cookiesAEnregistrer.forEach(({ name, value, options }) =>
              stockageCookies.set(name, value, options)
            );
          } catch (erreur) {
            // Ignorer les erreurs d'écriture de cookies si appelé depuis un Server Component en lecture seule
          }
        },
      },
    }
  );
}
