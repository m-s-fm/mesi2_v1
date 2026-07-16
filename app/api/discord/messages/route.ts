import { NextRequest, NextResponse } from 'next/server';
import { FournisseurDiscord } from '@/lib/providers/discord';
import { obtenirConsommationApi } from '@/lib/budget';
import { creerClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Récupère les fils de discussion Discord de l'utilisateur connecté.
 */
export async function GET(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    if (!utilisateur) {
      return NextResponse.json(
        { success: false, error: "Non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const idUtilisateur = utilisateur.id;
    const compteurGlobal = await obtenirConsommationApi('twitter');

    // Charger les fils de discussion via le fournisseur Discord
    const fournisseurDiscord = new FournisseurDiscord(idUtilisateur);
    const resultat = await fournisseurDiscord.obtenirFilsDiscussion();

    return NextResponse.json({ 
      success: true, 
      filsDiscussion: resultat.filsDiscussion, 
      globalApiCallCount: compteurGlobal
    });
  } catch (erreur: any) {
    console.error("API GET Discord messages error:", erreur);
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Impossible de charger les messages Discord." 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Envoie un nouveau message Discord dans une conversation.
 */
export async function POST(requete: NextRequest) {
  try {
    const clientSupabase = await creerClient();
    const { data: { user: utilisateur } } = await clientSupabase.auth.getUser();

    if (!utilisateur) {
      return NextResponse.json(
        { success: false, error: "Non autorisé. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const idUtilisateur = utilisateur.id;
    const { threadId: idFil, text: texte } = await requete.json();

    if (!idFil || !texte) {
      return NextResponse.json(
        { success: false, error: "Paramètres threadId et text requis dans le corps de la requête." },
        { status: 400 }
      );
    }

    // Récupérer le pseudo Discord et l'avatar de l'utilisateur connecté pour l'envoi personnalisé (webhook)
    const { data: sessionDiscord } = await supabase
      .from('discord_sessions')
      .select('discord_username, discord_user_id, discord_avatar')
      .eq('user_id', idUtilisateur)
      .maybeSingle();

    const nomUtilisateur = sessionDiscord?.discord_username;
    const urlAvatar = sessionDiscord?.discord_avatar && sessionDiscord?.discord_user_id
      ? `https://cdn.discordapp.com/avatars/${sessionDiscord.discord_user_id}/${sessionDiscord.discord_avatar}.png`
      : undefined;

    // Envoyer le message via le fournisseur Discord
    const fournisseurDiscord = new FournisseurDiscord(idUtilisateur);
    const messageEnvoye = await fournisseurDiscord.envoyerMessage(idFil, texte, {
      nomUtilisateur,
      urlAvatar
    });

    const compteurGlobal = await obtenirConsommationApi('twitter');

    return NextResponse.json({ 
      success: true, 
      message: messageEnvoye,
      globalApiCallCount: compteurGlobal
    });
  } catch (erreur: any) {
    console.error("API POST Discord messages error:", erreur);
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Échec de l'envoi du message Discord." 
      }, 
      { status: 500 }
    );
  }
}
