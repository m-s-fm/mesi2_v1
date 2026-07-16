import { NextRequest, NextResponse } from 'next/server';
import { creerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/discord/callback?code=...&state=...
 * Traite le retour OAuth2 Discord, échange le code contre un token,
 * et enregistre le compte Discord lié dans `discord_sessions`.
 */
export async function GET(requete: NextRequest) {
  try {
    const { searchParams } = new URL(requete.url);
    const code = searchParams.get('code');
    const etatBrut = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/?discord_error=no_code', requete.url));
    }

    // Décoder l'état pour récupérer l'id utilisateur Supabase
    let idUtilisateur: string | null = null;
    if (etatBrut) {
      try {
        const etat = JSON.parse(Buffer.from(etatBrut, 'base64').toString('utf8'));
        idUtilisateur = etat.idUtilisateur;
      } catch {
        // Fallback : utiliser la session courante
      }
    }

    // Si pas d'id dans l'état, utiliser la session active
    if (!idUtilisateur) {
      const clientSupabase = await creerClient();
      const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();
      if (!utilisateur) {
        return NextResponse.redirect(new URL('/login', requete.url));
      }
      idUtilisateur = utilisateur.id;
    }

    const idClient = process.env.DISCORD_CLIENT_ID || '';
    const secretClient = process.env.DISCORD_CLIENT_SECRET || '';
    const uriRedirection = process.env.DISCORD_REDIRECT_URI || '';

    // Échanger le code contre un token d'accès
    const reponseToken = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: idClient,
        client_secret: secretClient,
        grant_type: 'authorization_code',
        code,
        redirect_uri: uriRedirection,
      }).toString(),
    });

    if (!reponseToken.ok) {
      const erreur = await reponseToken.text();
      console.error('[Discord Callback] Erreur échange token :', erreur);
      return NextResponse.redirect(new URL('/?discord_error=token_failed', requete.url));
    }

    const donnéesToken = await reponseToken.json();
    const tokenAcces: string = donnéesToken.access_token;

    // Récupérer le profil Discord de l'utilisateur
    const reponseUtilisateur = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenAcces}` },
    });

    if (!reponseUtilisateur.ok) {
      return NextResponse.redirect(new URL('/?discord_error=profile_failed', requete.url));
    }

    const utilisateurDiscord = await reponseUtilisateur.json();

    // Enregistrer / mettre à jour la session Discord dans Supabase
    const { error: erreurUpsert } = await supabaseAdmin.from('discord_sessions').upsert({
      user_id: idUtilisateur,
      discord_user_id: utilisateurDiscord.id,
      discord_username: utilisateurDiscord.username,
      discord_avatar: utilisateurDiscord.avatar,
      bot_token_verified: true,
    }, { onConflict: 'user_id' });

    if (erreurUpsert) {
      console.error('[Discord Callback] Erreur upsert session :', erreurUpsert.message);
      return NextResponse.redirect(new URL('/?discord_error=db_failed', requete.url));
    }

    console.log(`[Discord Callback] Compte lié : @${utilisateurDiscord.username} → ${idUtilisateur}`);
    return NextResponse.redirect(new URL('/?discord_connected=1', requete.url));
  } catch (erreur: any) {
    console.error('[Discord Callback] Erreur inattendue :', erreur);
    return NextResponse.redirect(new URL('/?discord_error=unknown', requete.url));
  }
}
