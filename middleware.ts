import { NextResponse, type NextRequest } from 'next/server';
import { mettreAJourSession } from './lib/supabase/middleware';
import { possedeAbonnementActif } from './lib/subscription';

/**
 * Middleware racine pour la gestion de la sécurité, des sessions et du mur d'abonnement.
 */
export async function middleware(requete: NextRequest) {
  // 1. Rafraîchir la session de l'utilisateur et récupérer les cookies mis à jour
  const { reponseSupabase, utilisateur } = await mettreAJourSession(requete);

  const lienUrl = requete.nextUrl.clone();
  const chemin = lienUrl.pathname;

  // 2. Définir les routes entièrement publiques (accessibles sans connexion)
  const estRouteAnonyme = 
    chemin === '/login' ||
    chemin.startsWith('/api/stripe/webhook') ||
    chemin.startsWith('/api/auth') ||
    chemin.startsWith('/_next') ||
    chemin === '/favicon.ico';

  // 3. Cas de l'utilisateur non authentifié
  if (!utilisateur) {
    if (!estRouteAnonyme) {
      lienUrl.pathname = '/login';
      return NextResponse.redirect(lienUrl);
    }
    return reponseSupabase;
  }

  // 4. Cas de l'utilisateur authentifié
  // Définir les routes d'abonnement ou de facturation exemptées de la vérification d'abonnement actif
  const estRouteTarifOuFacturation =
    chemin === '/pricing' ||
    chemin.startsWith('/api/stripe/checkout') ||
    chemin.startsWith('/api/stripe/portal');

  // Rediriger les utilisateurs déjà connectés loin de la page login
  if (chemin === '/login') {
    const abonnementActif = await possedeAbonnementActif(utilisateur.id);
    lienUrl.pathname = abonnementActif ? '/' : '/pricing';
    return NextResponse.redirect(lienUrl);
  }

  // Vérifier le statut de l'abonnement en base de données
  const abonnementActif = await possedeAbonnementActif(utilisateur.id);

  if (!abonnementActif) {
    // Si l'abonnement est inactif et que l'utilisateur tente d'accéder à une page protégée
    if (!estRouteTarifOuFacturation && !estRouteAnonyme) {
      lienUrl.pathname = '/pricing';
      return NextResponse.redirect(lienUrl);
    }
  } else {
    // Si l'abonnement est actif et que l'utilisateur va sur la page pricing, le renvoyer vers l'inbox
    if (chemin === '/pricing') {
      lienUrl.pathname = '/';
      return NextResponse.redirect(lienUrl);
    }
  }

  return reponseSupabase;
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les routes sauf les fichiers statiques de Next.js, images, favicons, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
