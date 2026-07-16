import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Met à jour la session utilisateur côté serveur dans le middleware Next.js.
 * Rafraîchit automatiquement le jeton d'accès et réécrit les cookies de session.
 */
export async function mettreAJourSession(requete: NextRequest) {
  let reponseSupabase = NextResponse.next({
    request: requete,
  });

  const clientSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      cookies: {
        getAll() {
          return requete.cookies.getAll();
        },
        setAll(cookiesAEnregistrer) {
          cookiesAEnregistrer.forEach(({ name, value }) => requete.cookies.set(name, value));
          reponseSupabase = NextResponse.next({
            request: requete,
          });
          cookiesAEnregistrer.forEach(({ name, value, options }) =>
            reponseSupabase.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user: utilisateur },
  } = await clientSupabase.auth.getUser();

  return { reponseSupabase, utilisateur };
}
