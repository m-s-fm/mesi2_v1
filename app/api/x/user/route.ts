import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { obtenirConsommationApi } from '@/lib/budget';
import { creerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint API pour récupérer le statut de connexion Twitter/X de l'utilisateur connecté.
 */
export async function GET(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    // Récupérer la consommation budgétaire globale actuelle de l'API X
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

    // Récupérer la session X de l'utilisateur en base de données (via client admin)
    const { data: sessionX, error: erreurDb } = await supabase
      .from('x_sessions')
      .select('x_username, x_user_id')
      .eq('user_id', idUtilisateur)
      .maybeSingle();

    if (erreurDb) {
      console.error("Erreur base de données statut X :", erreurDb);
      return NextResponse.json({ 
        success: false, 
        connected: false,
        error: "Erreur base de données",
        globalApiCallCount: compteurGlobal
      });
    }

    if (!sessionX) {
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
        username: sessionX.x_username,
        name: `@${sessionX.x_username}`,
      },
      globalApiCallCount: compteurGlobal
    });
  } catch (erreur: any) {
    console.error("Erreur statut utilisateur X :", erreur);
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Erreur interne." 
      }, 
      { status: 500 }
    );
  }
}
