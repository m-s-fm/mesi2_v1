import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGlobalApiUsage } from '@/lib/budget';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Récupérer le compteur global d'appels API
    const globalCount = await getGlobalApiUsage();

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        connected: false,
        error: "Missing user_id parameter",
        globalApiCallCount: globalCount
      });
    }

    // Récupérer la session de l'utilisateur en base
    const { data: session, error: dbError } = await supabase
      .from('x_sessions')
      .select('x_username, x_user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbError) {
      console.error("Erreur base de données statut X :", dbError);
      return NextResponse.json({ 
        success: false, 
        connected: false,
        error: "Erreur base de données",
        globalApiCallCount: globalCount
      });
    }

    if (!session) {
      return NextResponse.json({ 
        success: true, 
        connected: false, 
        globalApiCallCount: globalCount 
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      user: {
        username: session.x_username,
        name: `@${session.x_username}`,
      },
      globalApiCallCount: globalCount
    });
  } catch (error: any) {
    console.error("Erreur statut utilisateur X :", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Erreur interne." 
      }, 
      { status: 500 }
    );
  }
}
