import { NextRequest, NextResponse } from 'next/server';
import { TwitterProvider } from '@/lib/providers/twitter';
import { supabase } from '@/lib/supabase';
import { decrypt, encrypt } from '@/lib/crypto';
import { checkAndIncrementApiUsage } from '@/lib/budget';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Helper to fetch and validate the OAuth 2.0 access token, refreshing if expired.
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const { data: session, error: dbError } = await supabase
    .from('x_sessions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (dbError || !session) {
    throw new Error("Veuillez d'abord lier votre compte Twitter/X.");
  }

  let accessToken = decrypt(session.access_token);
  const refreshToken = decrypt(session.refresh_token);
  const expiresAt = new Date(session.expires_at).getTime();

  // Refresh token if it's expired or close to expiring (within 60s)
  if (expiresAt <= Date.now() + 60 * 1000) {
    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      throw new Error("Configuration OAuth 2.0 de X manquante sur le serveur.");
    }

    const client = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: newExpiresIn } = 
      await client.refreshOAuth2Token(refreshToken);

    const encryptedAccessToken = encrypt(newAccessToken);
    const encryptedRefreshToken = encrypt(newRefreshToken || '');
    const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('x_sessions')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: newExpiresAt
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Erreur de sauvegarde des nouveaux tokens rafraîchis :", updateError);
    }

    accessToken = newAccessToken;
  }

  return accessToken;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const nextToken = searchParams.get('nextToken') || undefined;

    console.log(`\n[API GET messages] Requête reçue pour user_id: ${userId} (nextToken: ${nextToken || 'aucun'})`);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Identifiant utilisateur user_id manquant." },
        { status: 400 }
      );
    }

    // 1. Vérifier et incrémenter le quota global de facturation
    const cost = nextToken ? 1 : 2;
    console.log(`[API GET messages] Vérification du budget global (coût estimé: ${cost})...`);
    const { allowed, currentCount } = await checkAndIncrementApiUsage(cost);
    console.log(`[API GET messages] Budget vérifié. Autorisé: ${allowed}, Compteur actuel: ${currentCount}`);

    if (!allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Quota API global atteint pour cette démo (150 appels max). Envoi bloqué.", 
          globalApiCallCount: currentCount 
        },
        { status: 429 }
      );
    }

    // 2. Récupérer le jeton valide
    console.log(`[API GET messages] Récupération du jeton d'accès pour user_id: ${userId}...`);
    const accessToken = await getValidAccessToken(userId);
    console.log(`[API GET messages] Jeton d'accès récupéré avec succès.`);

    // 3. Charger les messages
    console.log(`[API GET messages] Initialisation de TwitterProvider et appel de getThreads...`);
    const provider = new TwitterProvider(accessToken);
    const result = await provider.getThreads(nextToken);
    console.log(`[API GET messages] getThreads terminé avec succès. Nombre de conversations trouvées: ${result.threads.length}`);

    return NextResponse.json({ 
      success: true, 
      threads: result.threads, 
      nextToken: result.nextToken,
      globalApiCallCount: currentCount
    });
  } catch (error: any) {
    console.error("API GET messages error:", error);
    
    // Déterminer s'il s'agit d'un problème de session
    const isSessionError = error.message && error.message.includes("lier votre compte");
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Impossible de charger les messages X." 
      }, 
      { status: isSessionError ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, threadId, text } = await request.json();

    if (!userId || !threadId || !text) {
      return NextResponse.json(
        { success: false, error: "Paramètres userId, threadId et text requis." },
        { status: 400 }
      );
    }

    // 1. Vérifier et incrémenter le quota global de facturation (1 appel pour l'envoi)
    const { allowed, currentCount } = await checkAndIncrementApiUsage(1);

    if (!allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Quota API global atteint pour cette démo (150 appels max). Envoi bloqué.", 
          globalApiCallCount: currentCount 
        },
        { status: 429 }
      );
    }

    // 2. Récupérer le jeton valide
    const accessToken = await getValidAccessToken(userId);

    // 3. Envoyer le message
    const provider = new TwitterProvider(accessToken);
    const message = await provider.sendMessage(threadId, text);

    return NextResponse.json({ 
      success: true, 
      message,
      globalApiCallCount: currentCount
    });
  } catch (error: any) {
    console.error("API POST messages error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Échec de l'envoi du message X." 
      }, 
      { status: 500 }
    );
  }
}
