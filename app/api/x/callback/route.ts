import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error("X OAuth Error from query:", errorParam);
      return NextResponse.redirect(`${new URL(request.url).origin}/?error=${encodeURIComponent(errorParam)}`);
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Paramètres code et state requis pour l'échange OAuth." },
        { status: 400 }
      );
    }

    // 1. Récupérer la tentative correspondante en base
    const { data: attempt, error: dbError } = await supabase
      .from('x_login_attempts')
      .select('*')
      .eq('state', state)
      .maybeSingle();

    if (dbError || !attempt) {
      console.error("Tentative invalide ou expirée :", dbError);
      return NextResponse.json(
        { error: "Session d'authentification X expirée ou invalide. Veuillez réessayer." },
        { status: 400 }
      );
    }

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';

    // 2. Échanger le code contre les tokens d'accès
    const client = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    const redirectUri = process.env.X_REDIRECT_URI || `${new URL(request.url).origin}/api/x/callback`;

    const { client: userClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code: code,
      codeVerifier: attempt.code_verifier,
      redirectUri: redirectUri,
    });

    // 3. Récupérer les informations de l'utilisateur X connecté
    const me = await userClient.v2.me();
    const xUsername = me.data.username;
    const xUserId = me.data.id;

    // 4. Chiffrer les tokens d'accès et de rafraîchissement
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : '';
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 5. Enregistrer / Mettre à jour la session en base (x_sessions)
    const { error: upsertError } = await supabase
      .from('x_sessions')
      .upsert({
        user_id: attempt.user_id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        x_username: xUsername,
        x_user_id: xUserId,
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error("Erreur lors de l'enregistrement de la session chiffrée :", upsertError);
      return NextResponse.json(
        { error: "Impossible de finaliser l'enregistrement de votre compte X." },
        { status: 500 }
      );
    }

    // 6. Nettoyer les tentatives de connexion
    // Supprimer la tentative actuelle
    await supabase.from('x_login_attempts').delete().eq('id', attempt.id);
    
    // Supprimer les tentatives de plus de 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase.from('x_login_attempts').delete().lt('created_at', tenMinutesAgo);

    // 7. Rediriger l'utilisateur vers le dashboard principal avec son ID
    return NextResponse.redirect(`${new URL(request.url).origin}/?user_id=${attempt.user_id}`);
  } catch (error: any) {
    console.error("Erreur durant le callback X OAuth :", error);
    
    if (error.data) {
      console.error("Détails complets de la réponse d'erreur de X :", JSON.stringify(error.data, null, 2));
    }

    return NextResponse.json(
      { 
        error: error.message || "Erreur interne lors du callback.",
        details: error.data || null
      },
      { status: error.code || 500 }
    );
  }
}
