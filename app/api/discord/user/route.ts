import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { obtenirConsommationApi } from '@/lib/budget';
import { creerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint API pour récupérer le statut de connexion Discord de l'utilisateur connecté.
 */
export async function GET(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    // La consommation de l'API de Discord n'est pas limitée financièrement comme Twitter/X,
    // mais on peut renvoyer 0 ou la consommation globale Twitter si nécessaire.
    const compteurGlobal = await obtenirConsommationApi('twitter');

    if (!utilisateur) {
      return NextResponse.json({ 
        success: false, 
        connected: false,
        error: "Non autorisé",
        globalApiCallCount: compteurGlobal
      }, { status: 401 });
    }

    const idUtilisateur = utilisateur.id;

    // Récupérer la session Discord de l'utilisateur en base de données
    const { data: sessionDiscord, error: erreurDb } = await supabase
      .from('discord_sessions')
      .select('discord_username, discord_user_id')
      .eq('user_id', idUtilisateur)
      .maybeSingle();

    if (erreurDb) {
      console.error("Erreur base de données statut Discord :", erreurDb);
      return NextResponse.json({ 
        success: false, 
        connected: false,
        error: "Erreur base de données",
        globalApiCallCount: compteurGlobal
      });
    }

    if (!sessionDiscord) {
      return NextResponse.json({ 
        success: true, 
        connected: false, 
        globalApiCallCount: compteurGlobal 
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      user: {
        username: sessionDiscord.discord_username,
        name: `@${sessionDiscord.discord_username}`,
      },
      globalApiCallCount: compteurGlobal
    });
  } catch (erreur: any) {
    console.error("Erreur statut utilisateur Discord :", erreur);
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Erreur interne." 
      }, 
      { status: 500 }
    );
  }
}
