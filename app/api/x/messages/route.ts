import { NextRequest, NextResponse } from 'next/server';
import { FournisseurTwitter } from '@/lib/providers/twitter';
import { verifierBudget, incrementerBudget } from '@/lib/budget';
import { creerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Récupère les fils de discussion (messages directs) Twitter/X de l'utilisateur connecté.
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
    const { searchParams: parametresRecherche } = new URL(requete.url);
    const prochainJeton = parametresRecherche.get('nextToken') || undefined;

    console.log(`\n[API GET messages] Requête reçue pour idUtilisateur: ${idUtilisateur} (prochainJeton: ${prochainJeton || 'aucun'})`);

    // 1. Vérifier le budget d'appels API (coût estimé de 1 ou 2 selon la pagination)
    const cout = prochainJeton ? 1 : 2;
    console.log(`[API GET messages] Vérification du budget global (coût estimé: ${cout})...`);
    const { autorise, consommationActuelle } = await verifierBudget('twitter', cout);
    console.log(`[API GET messages] Budget vérifié. Autorisé: ${autorise}, Compteur actuel: ${consommationActuelle}`);

    if (!autorise) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Quota API global atteint pour cette démo (150 appels max). Envoi bloqué.", 
          globalApiCallCount: consommationActuelle 
        },
        { status: 429 }
      );
    }

    // 2. Charger les fils de discussion via le fournisseur Twitter/X
    console.log(`[API GET messages] Initialisation de FournisseurTwitter et appel de obtenirFilsDiscussion...`);
    const fournisseurTwitter = new FournisseurTwitter();
    const resultat = await fournisseurTwitter.obtenirFilsDiscussion(idUtilisateur, prochainJeton);
    console.log(`[API GET messages] obtenirFilsDiscussion terminé avec succès. Nombre de conversations trouvées: ${resultat.filsDiscussion.length}`);

    // 3. Incrémenter la consommation d'API enregistrée après exécution réussie
    const { consommationActuelle: compteurMisAJour } = await incrementerBudget('twitter', cout);

    return NextResponse.json({ 
      success: true, 
      filsDiscussion: resultat.filsDiscussion, 
      nextToken: resultat.prochainJeton,
      globalApiCallCount: compteurMisAJour
    });
  } catch (erreur: any) {
    console.error("API GET messages error:", erreur);
    
    const estErreurSession = erreur.message && erreur.message.includes("lier votre compte");
    
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Impossible de charger les messages X." 
      }, 
      { status: estErreurSession ? 401 : 500 }
    );
  }
}

/**
 * Envoie un nouveau message direct Twitter/X dans une conversation.
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

    // 1. Vérifier le budget d'appels API (coût de 1 pour un envoi)
    const { autorise, consommationActuelle } = await verifierBudget('twitter', 1);

    if (!autorise) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Quota API global atteint pour cette démo (150 appels max). Envoi bloqué.", 
          globalApiCallCount: consommationActuelle 
        },
        { status: 429 }
      );
    }

    // 2. Envoyer le message via le fournisseur Twitter/X
    const fournisseurTwitter = new FournisseurTwitter();
    const messageEnvoye = await fournisseurTwitter.envoyerMessage(idUtilisateur, idFil, texte);

    // 3. Incrémenter le budget après envoi réussi
    const { consommationActuelle: compteurMisAJour } = await incrementerBudget('twitter', 1);

    return NextResponse.json({ 
      success: true, 
      message: messageEnvoye,
      globalApiCallCount: compteurMisAJour
    });
  } catch (erreur: any) {
    console.error("API POST messages error:", erreur);
    return NextResponse.json(
      { 
        success: false, 
        error: erreur.message || "Échec de l'envoi du message X." 
      }, 
      { status: 500 }
    );
  }
}
