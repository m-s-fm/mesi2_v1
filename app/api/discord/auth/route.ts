import { NextResponse } from 'next/server';
import { creerClient } from '@/lib/supabase/server';

/**
 * GET /api/discord/auth
 * Génère l'URL d'autorisation OAuth2 Discord et redirige l'utilisateur.
 */
export async function GET() {
  const clientSupabase = await creerClient();
  const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

  if (!utilisateur) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL));
  }

  const idClient = process.env.DISCORD_CLIENT_ID || '';
  const uriRedirection = process.env.DISCORD_REDIRECT_URI || '';

  // Stocker l'id utilisateur dans l'état OAuth pour le récupérer au callback
  const etat = Buffer.from(JSON.stringify({ idUtilisateur: utilisateur.id })).toString('base64');

  const params = new URLSearchParams({
    client_id: idClient,
    redirect_uri: uriRedirection,
    response_type: 'code',
    scope: 'identify guilds',
    state: etat,
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
