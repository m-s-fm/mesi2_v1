import { TwitterApi } from 'twitter-api-v2';
import { FournisseurMessage, FilDiscussion, Message, Participant } from './types';
import { supabase } from '../supabase';
import { dechiffrer, chiffrer } from '../crypto';

/**
 * Implémentation du fournisseur de messagerie Twitter/X (OAuth 2.0 PKCE).
 */
export class FournisseurTwitter implements FournisseurMessage {
  
  /**
   * Helper interne pour obtenir le client TwitterApi configuré pour un utilisateur donné.
   */
  private async obtenirClient(idUtilisateur: string): Promise<TwitterApi> {
    const jetonAcces = await this.obtenirJetonAccesValide(idUtilisateur);
    return new TwitterApi(jetonAcces);
  }

  /**
   * Récupère le jeton d'accès en base de données, le rafraîchit si expiré et le déchiffre.
   */
  private async obtenirJetonAccesValide(idUtilisateur: string): Promise<string> {
    const { data: session, error: dbError } = await supabase
      .from('x_sessions')
      .select('*')
      .eq('user_id', idUtilisateur)
      .maybeSingle();

    if (dbError || !session) {
      throw new Error("Veuillez d'abord lier votre compte Twitter/X.");
    }

    let jetonAcces = dechiffrer(session.access_token);
    const jetonRafraichissement = dechiffrer(session.refresh_token);
    const expireLe = new Date(session.expires_at).getTime();

    // Rafraîchir le jeton d'accès s'il expire dans moins de 60 secondes
    if (expireLe <= Date.now() + 60 * 1000) {
      const clientId = process.env.X_CLIENT_ID || '';
      const clientSecret = process.env.X_CLIENT_SECRET || '';

      if (!clientId || !clientSecret) {
        throw new Error("Configuration OAuth 2.0 de X manquante sur le serveur.");
      }

      const client = new TwitterApi({
        clientId: clientId,
        clientSecret: clientSecret,
      });

      // Appel de l'API X pour renouveler les jetons
      const { 
        accessToken: nouveauJetonAcces, 
        refreshToken: nouveauJetonRafraichissement, 
        expiresIn: nouvelleDureeExpiration 
      } = await client.refreshOAuth2Token(jetonRafraichissement);

      const jetonAccesChiffre = chiffrer(nouveauJetonAcces);
      const jetonRafraichissementChiffre = chiffrer(nouveauJetonRafraichissement || '');
      const nouvelleDateExpiration = new Date(Date.now() + nouvelleDureeExpiration * 1000).toISOString();

      // Sauvegarder les nouveaux jetons chiffrés en base de données
      const { error: updateError } = await supabase
        .from('x_sessions')
        .update({
          access_token: jetonAccesChiffre,
          refresh_token: jetonRafraichissementChiffre,
          expires_at: nouvelleDateExpiration
        })
        .eq('user_id', idUtilisateur);

      if (updateError) {
        console.error("Erreur de sauvegarde des nouveaux tokens rafraîchis :", updateError);
      }

      jetonAcces = nouveauJetonAcces;
    }

    return jetonAcces;
  }

  /**
   * Récupère le profil public Twitter de l'utilisateur connecté.
   */
  async obtenirProfil(idUtilisateur: string): Promise<Participant> {
    try {
      const clientTwitter = await this.obtenirClient(idUtilisateur);
      const moi = await clientTwitter.v2.me({
        'user.fields': ['profile_image_url', 'username', 'name']
      });
      return {
        id: moi.data.id,
        nomUtilisateur: moi.data.username,
        nom: moi.data.name,
        urlAvatar: moi.data.profile_image_url
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur authentifié X:", error);
      throw error;
    }
  }

  /**
   * Récupère les fils de discussion (conversations DM) avec gestion de la pagination.
   */
  async obtenirFilsDiscussion(
    idUtilisateur: string, 
    prochainJeton?: string
  ): Promise<{ filsDiscussion: FilDiscussion[]; prochainJeton?: string }> {
    try {
      console.log(`[FournisseurTwitter] obtenirFilsDiscussion - Etape 1 : Récupération du profil utilisateur authentifié pour idUtilisateur: ${idUtilisateur}...`);
      const moi = await this.obtenirProfil(idUtilisateur);
      const monId = moi.id;
      console.log(`[FournisseurTwitter] obtenirFilsDiscussion - Etape 1 Réussie : @${moi.nomUtilisateur} (${monId})`);

      const clientTwitter = await this.obtenirClient(idUtilisateur);

      console.log("[FournisseurTwitter] obtenirFilsDiscussion - Etape 2 : Récupération des événements de messages directs (client.v2.listDmEvents)...");
      const params: any = {
        'dm_event.fields': ['id', 'text', 'sender_id', 'created_at', 'dm_conversation_id', 'event_type'],
        expansions: ['sender_id'],
        'user.fields': ['username', 'name', 'profile_image_url'],
        max_results: 5
      };

      if (prochainJeton) {
        params.pagination_token = prochainJeton;
      }

      const historiqueDm = await clientTwitter.v2.listDmEvents(params);
      const evenements = historiqueDm.events || [];
      const inclusions = historiqueDm.includes || {};
      const utilisateursApi = inclusions.users || [];
      console.log(`[FournisseurTwitter] obtenirFilsDiscussion - Etape 2 Réussie : ${evenements.length} événements de messages récupérés.`);

      // Associer les profils utilisateurs par ID
      const carteUtilisateurs = new Map<string, Participant>();
      
      carteUtilisateurs.set(monId, moi);

      for (const u of utilisateursApi) {
        carteUtilisateurs.set(u.id, {
          id: u.id,
          nomUtilisateur: u.username,
          nom: u.name,
          urlAvatar: u.profile_image_url
        });
      }

      // Regrouper les messages par conversation
      const carteFils = new Map<string, Message[]>();

      for (const evenement of evenements) {
        if (evenement.event_type !== 'MessageCreate') continue;

        const idExpediteur = evenement.sender_id || '';
        const expediteur = carteUtilisateurs.get(idExpediteur);

        const messageNormalise: Message = {
          id: evenement.id,
          idExpediteur: idExpediteur,
          nomUtilisateurExpediteur: expediteur?.nomUtilisateur || `user_${idExpediteur}`,
          nomExpediteur: expediteur?.nom || `Utilisateur ${idExpediteur}`,
          texte: evenement.text || '',
          creeLe: evenement.created_at || new Date().toISOString(),
          plateforme: 'twitter'
        };

        const idConversation = evenement.dm_conversation_id || 'default';
        if (!carteFils.has(idConversation)) {
          carteFils.set(idConversation, []);
        }
        carteFils.get(idConversation)!.push(messageNormalise);
      }

      // Construire la liste de fils de discussion normalisés
      const filsDiscussion: FilDiscussion[] = [];

      for (const [idConversation, listeMessages] of carteFils.entries()) {
        // Tri chronologique des messages
        listeMessages.sort((a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime());

        // Identifier les participants distincts
        const idParticipantsDistincts = new Set<string>();
        for (const m of listeMessages) {
          idParticipantsDistincts.add(m.idExpediteur);
        }

        const participants: Participant[] = [];
        for (const pId of idParticipantsDistincts) {
          const p = carteUtilisateurs.get(pId) || { id: pId, nom: `@user_${pId}`, nomUtilisateur: `user_${pId}` };
          participants.push(p);
        }

        filsDiscussion.push({
          id: idConversation,
          participants,
          dernierMessage: listeMessages[listeMessages.length - 1],
          messages: listeMessages,
          plateforme: 'twitter'
        });
      }

      // Trier les conversations par date du dernier message (plus récent en premier)
      filsDiscussion.sort((a, b) => {
        const dateA = a.dernierMessage ? new Date(a.dernierMessage.creeLe).getTime() : 0;
        const dateB = b.dernierMessage ? new Date(b.dernierMessage.creeLe).getTime() : 0;
        return dateB - dateA;
      });

      const jetonSuivant = (historiqueDm as any).nextToken || (historiqueDm as any).meta?.next_token || undefined;

      return {
        filsDiscussion,
        prochainJeton: jetonSuivant
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations X:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des messages pour une conversation donnée.
   */
  async obtenirMessages(idUtilisateur: string, idFil: string): Promise<Message[]> {
    try {
      const { filsDiscussion } = await this.obtenirFilsDiscussion(idUtilisateur);
      const fil = filsDiscussion.find(t => t.id === idFil);
      return fil ? fil.messages : [];
    } catch (error) {
      console.error(`Erreur lors de la récupération des messages du fil ${idFil}:`, error);
      throw error;
    }
  }

  /**
   * Envoie un message direct dans un fil de discussion X.
   */
  async envoyerMessage(idUtilisateur: string, idFil: string, texte: string): Promise<Message> {
    try {
      const moi = await this.obtenirProfil(idUtilisateur);
      const monId = moi.id;

      const clientTwitter = await this.obtenirClient(idUtilisateur);

      // Envoyer le message sur l'API X
      const response = await clientTwitter.v2.sendDmInConversation(idFil, {
        text: texte
      });

      // Extraire l'ID du message envoyé
      const eventId = (response as any).data?.dm_event_id || (response as any).dm_event_id || `sent_${Date.now()}`;

      const nouveauMessage: Message = {
        id: eventId,
        idExpediteur: monId,
        nomUtilisateurExpediteur: moi.nomUtilisateur,
        nomExpediteur: moi.nom,
        texte: texte,
        creeLe: new Date().toISOString(),
        plateforme: 'twitter'
      };

      return nouveauMessage;
    } catch (error) {
      console.error(`Erreur lors de l'envoi du message sur la conversation ${idFil}:`, error);
      throw error;
    }
  }
}
