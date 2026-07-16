import { NextRequest, NextResponse } from 'next/server';
import { creerClient } from '@/lib/supabase/server';

/**
 * Endpoint API pour déconnecter l'utilisateur courant et réinitialiser sa session cookie.
 */
export async function GET(requete: NextRequest) {
  const clientSupabase = await creerClient();
  await clientSupabase.auth.signOut();
  const { origin } = new URL(requete.url);
  return NextResponse.redirect(`${origin}/login`);
}
