import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: "Le paramètre user_id (UUID) est requis pour lier le compte X." },
        { status: 400 }
      );
    }

    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Les variables d'environnement X_CLIENT_ID ou X_CLIENT_SECRET ne sont pas configurées." },
        { status: 500 }
      );
    }

    // Instancier le client Twitter API v2 en mode OAuth2
    const client = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    //   const redirectUri = `${new URL(request.url).origin}/api/x/callback`;
    const redirectUri = process.env.X_REDIRECT_URI;

    if (!redirectUri) {
      throw new Error("X_REDIRECT_URI n'est pas défini dans .env.local");
    }

    // Générer le lien OAuth 2.0 PKCE
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      redirectUri,
      { scope: ['tweet.read', 'users.read', 'dm.read', 'dm.write', 'offline.access'] }
    );

    // Enregistrer l'état de la tentative de connexion en base (x_login_attempts)
    const { error: dbError } = await supabase.from('x_login_attempts').insert({
      user_id: userId,
      code_verifier: codeVerifier,
      state: state,
    });

    if (dbError) {
      console.error("Erreur lors de l'enregistrement de la tentative de connexion :", dbError);
      return NextResponse.json(
        { error: "Impossible de lancer le flux d'autorisation (erreur base de données)." },
        { status: 500 }
      );
    }

    // Rediriger l'utilisateur vers X
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("Erreur d'initialisation de l'authentification X :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
