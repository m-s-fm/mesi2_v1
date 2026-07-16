import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { supabase } from '@/lib/supabase';
import { creerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint API pour initier le flux OAuth 2.0 PKCE vers Twitter/X.
 */
export async function GET(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    if (!utilisateur) {
      return NextResponse.json(
        { error: "Non autorisé. Veuillez vous connecter d'abord." },
        { status: 401 }
      );
    }

    const idUtilisateur = utilisateur.id;
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Les variables d'environnement X_CLIENT_ID ou X_CLIENT_SECRET ne sont pas configurées." },
        { status: 500 }
      );
    }

    const clientTwitter = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    const lienRedirection = process.env.X_REDIRECT_URI;

    if (!lienRedirection) {
      throw new Error("X_REDIRECT_URI n'est pas défini dans .env.local");
    }

    // Générer l'URL d'autorisation et le couple verifier/state requis par OAuth 2.0 PKCE
    const { url: lienAutorisation, codeVerifier: verificateurCode, state: etat } = clientTwitter.generateOAuth2AuthLink(
      lienRedirection,
      { scope: ['tweet.read', 'users.read', 'dm.read', 'dm.write', 'offline.access'] }
    );

    // Enregistrer la tentative en base de données pour la valider lors du callback (via client admin)
    const { error: erreurDb } = await supabase.from('x_login_attempts').insert({
      user_id: idUtilisateur,
      code_verifier: verificateurCode,
      state: etat,
    });

    if (erreurDb) {
      console.error("Erreur lors de l'enregistrement de la tentative de connexion :", erreurDb);
      return NextResponse.json(
        { error: "Impossible de lancer le flux d'autorisation (erreur base de données)." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(lienAutorisation);
  } catch (erreur: any) {
    console.error("Erreur d'initialisation de l'authentification X :", erreur);
    return NextResponse.json(
      { error: erreur.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
