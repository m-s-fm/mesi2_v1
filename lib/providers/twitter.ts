import { TwitterApi } from 'twitter-api-v2';
import { MessageProvider, Thread, Message, Participant } from './types';

export class TwitterProvider implements MessageProvider {
  private client: TwitterApi;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error(
        "Jeton d'accès X manquant. Veuillez lier votre compte X."
      );
    }

    this.client = new TwitterApi(accessToken);
  }

  async getMe() {
    try {
      const me = await this.client.v2.me({
        'user.fields': ['profile_image_url', 'username', 'name']
      });
      return me.data;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur authentifié X:", error);
      throw error;
    }
  }

  async getThreads(nextToken?: string): Promise<{ threads: Thread[]; nextToken?: string }> {
    try {
      console.log("[TwitterProvider] getThreads - Etape 1 : Récupération du profil utilisateur authentifié (client.v2.me)...");
      const me = await this.getMe();
      const myId = me.id;
      console.log(`[TwitterProvider] getThreads - Etape 1 Réussie : @${me.username} (${myId})`);

      console.log("[TwitterProvider] getThreads - Etape 2 : Récupération des événements de messages directs (client.v2.listDmEvents)...");
      const params: any = {
        'dm_event.fields': ['id', 'text', 'sender_id', 'created_at', 'dm_conversation_id', 'event_type'],
        expansions: ['sender_id'],
        'user.fields': ['username', 'name', 'profile_image_url'],
        max_results: 5
      };

      if (nextToken) {
        params.pagination_token = nextToken;
      }

      const dmTimeline = await this.client.v2.listDmEvents(params);
      const events = dmTimeline.events || [];
      const includes = dmTimeline.includes || {};
      const apiUsers = includes.users || [];
      console.log(`[TwitterProvider] getThreads - Etape 2 Réussie : ${events.length} événements de messages récupérés.`);

      // 3. Mapper les profils utilisateurs
      const userMap = new Map<string, Participant>();
      
      // S'ajouter soi-même
      userMap.set(myId, {
        id: myId,
        username: me.username,
        name: me.name,
        avatarUrl: me.profile_image_url
      });

      for (const u of apiUsers) {
        userMap.set(u.id, {
          id: u.id,
          username: u.username,
          name: u.name,
          avatarUrl: u.profile_image_url
        });
      }

      // 4. Regrouper les messages par conversation
      const threadsMap = new Map<string, Message[]>();

      for (const event of events) {
        if (event.event_type !== 'MessageCreate') continue;

        const senderId = event.sender_id || '';
        const sender = userMap.get(senderId);

        const msg: Message = {
          id: event.id,
          senderId: senderId,
          senderUsername: sender?.username || `user_${senderId}`,
          senderName: sender?.name || `Utilisateur ${senderId}`,
          text: event.text || '',
          createdAt: event.created_at || new Date().toISOString(),
          platform: 'twitter'
        };

        const conversationId = event.dm_conversation_id || 'default';
        if (!threadsMap.has(conversationId)) {
          threadsMap.set(conversationId, []);
        }
        threadsMap.get(conversationId)!.push(msg);
      }

      // 5. Construire les threads normalisés
      const threads: Thread[] = [];

      for (const [conversationId, messages] of threadsMap.entries()) {
        // Trier chronologiquement (plus ancien au plus récent pour le fil de discussion)
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Déterminer les participants distincts
        const participantIds = new Set<string>();
        for (const m of messages) {
          participantIds.add(m.senderId);
        }

        const participants: Participant[] = [];
        for (const pId of participantIds) {
          const p = userMap.get(pId) || { id: pId, name: `@user_${pId}`, username: `user_${pId}` };
          participants.push(p);
        }

        // Si l'autre participant n'a pas été résolu (ex. conversation à 2 mais seul un a parlé récemment),
        // on s'assure d'avoir au moins les participants actifs du message. 

        threads.push({
          id: conversationId,
          participants,
          lastMessage: messages[messages.length - 1],
          messages,
          platform: 'twitter'
        });
      }

      // Trier les conversations par date du dernier message (décroissant)
      threads.sort((a, b) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Récupérer le token suivant
      const responseNextToken = (dmTimeline as any).nextToken || (dmTimeline as any).meta?.next_token || undefined;

      return {
        threads,
        nextToken: responseNextToken
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations X:", error);
      throw error;
    }
  }

  async sendMessage(threadId: string, text: string): Promise<Message> {
    try {
      const me = await this.getMe();
      const myId = me.id;

      // Envoyer le message sur l'API X
      const response = await this.client.v2.sendDmInConversation(threadId, {
        text: text
      });

      // Extraire l'ID du message envoyé de manière robuste
      // @ts-ignore
      const eventId = response.data?.dm_event_id || response.dm_event_id || `sent_${Date.now()}`;

      const newMessage: Message = {
        id: eventId,
        senderId: myId,
        senderUsername: me.username,
        senderName: me.name,
        text: text,
        createdAt: new Date().toISOString(),
        platform: 'twitter'
      };

      return newMessage;
    } catch (error) {
      console.error(`Erreur lors de l'envoi du message sur la conversation ${threadId}:`, error);
      throw error;
    }
  }
}
