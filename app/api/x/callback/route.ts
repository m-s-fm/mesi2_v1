import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { supabase } from '@/lib/supabase';
import { chiffrer } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de callback appelé par Twitter/X après l'authentification de l'utilisateur.
 * Échange le code d'autorisation contre des jetons d'accès et rafraîchissement chiffrés.
 */
export async function GET(requete: NextRequest) {
  try {
    const { searchParams: parametresRecherche } = new URL(requete.url);
    const code = parametresRecherche.get('code');
    const state = parametresRecherche.get('state');
    const parametreErreur = parametresRecherche.get('error');

    if (parametreErreur) {
      console.error("X OAuth Error from query:", parametreErreur);
      return NextResponse.redirect(`${new URL(requete.url).origin}/?error=${encodeURIComponent(parametreErreur)}`);
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Paramètres code et state requis pour l'échange OAuth." },
        { status: 400 }
      );
    }

    // 1. Récupérer la tentative correspondante en base de données (client admin)
    const { data: tentative, error: erreurDb } = await supabase
      .from('x_login_attempts')
      .select('*')
      .eq('state', state)
      .maybeSingle();

    if (erreurDb || !tentative) {
      console.error("Tentative invalide ou expirée :", erreurDb);
      return NextResponse.json(
        { error: "Session d'authentification X expirée ou invalide. Veuillez réessayer." },
        { status: 400 }
      );
    }

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';

    // 2. Échanger le code contre les tokens d'accès
    const clientTwitter = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    const lienRedirection = process.env.X_REDIRECT_URI || `${new URL(requete.url).origin}/api/x/callback`;

    const { 
      client: clientUtilisateur, 
      accessToken: jetonAcces, 
      refreshToken: jetonRafraichissement, 
      expiresIn: dureeExpiration 
    } = await clientTwitter.loginWithOAuth2({
      code: code,
      codeVerifier: tentative.code_verifier,
      redirectUri: lienRedirection,
    });

    // 3. Récupérer les informations de l'utilisateur X connecté
    const moi = await clientUtilisateur.v2.me();
    const nomUtilisateurX = moi.data.username;
    const idUtilisateurX = moi.data.id;

    // 4. Chiffrer les tokens d'accès et de rafraîchissement
    const jetonAccesChiffre = chiffrer(jetonAcces);
    const jetonRafraichissementChiffre = jetonRafraichissement ? chiffrer(jetonRafraichissement) : '';
    const expireLe = new Date(Date.now() + dureeExpiration * 1000).toISOString();

    // 5. Enregistrer / Mettre à jour la session X de l'utilisateur en base
    const { error: erreurMiseAJour } = await supabase
      .from('x_sessions')
      .upsert({
        user_id: tentative.user_id,
        access_token: jetonAccesChiffre,
        refresh_token: jetonRafraichissementChiffre,
        expires_at: expireLe,
        x_username: nomUtilisateurX,
        x_user_id: idUtilisateurX,
      }, {
        onConflict: 'user_id'
      });

    if (erreurMiseAJour) {
      console.error("Erreur lors de l'enregistrement de la session chiffrée :", erreurMiseAJour);
      return NextResponse.json(
        { error: "Impossible de finaliser l'enregistrement de votre compte X." },
        { status: 500 }
      );
    }

    // 6. Nettoyer la tentative de connexion utilisée et les anciennes tentatives expirées
    await supabase.from('x_login_attempts').delete().eq('id', tentative.id);
    
    const ilYATenMinutes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase.from('x_login_attempts').delete().lt('created_at', ilYATenMinutes);

    // 7. Rediriger l'utilisateur vers le dashboard principal (la session Supabase gère l'accès)
    return NextResponse.redirect(`${new URL(requete.url).origin}/`);
  } catch (erreur: any) {
    console.error("Erreur durant le callback X OAuth :", erreur);
    
    if (erreur.data) {
      console.error("Détails complets de la réponse d'erreur de X :", JSON.stringify(erreur.data, null, 2));
    }

    return NextResponse.json(
      { 
        error: erreur.message || "Erreur interne lors du callback.",
        details: erreur.data || null
      },
      { status: erreur.code || 500 }
    );
  }
}
