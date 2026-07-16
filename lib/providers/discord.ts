import { createClient } from '@supabase/supabase-js';
import type { FilDiscussion, Message, Participant, Plateforme } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fournisseur Discord — lit les messages depuis la table Supabase `messages`
 * (alimentée en temps réel par le bot Discord autonome).
 */
export class FournisseurDiscord {
  constructor(private idUtilisateur: string) {}

  /**
   * Récupère tous les fils (canaux Discord) depuis Supabase, groupés par thread_id.
   */
  async obtenirFilsDiscussion(): Promise<{ filsDiscussion: FilDiscussion[] }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('platform', 'discord')
      .order('sent_at', { ascending: true });

    if (error) throw new Error(`Erreur Supabase Discord : ${error.message}`);

    // Regrouper par thread_id (canal Discord)
    const carteCanaux = new Map<string, any[]>();
    for (const msg of data || []) {
      if (!carteCanaux.has(msg.thread_id)) {
        carteCanaux.set(msg.thread_id, []);
      }
      carteCanaux.get(msg.thread_id)!.push(msg);
    }

    const filsDiscussion: FilDiscussion[] = Array.from(carteCanaux.entries()).map(
      ([idCanal, messages]) => {
        // Construire la liste de participants uniques
        const carteParticipants = new Map<string, Participant>();
        for (const m of messages) {
          if (!carteParticipants.has(m.sender_name)) {
            carteParticipants.set(m.sender_name, {
              id: m.sender_name,
              nomUtilisateur: m.sender_name,
              nom: m.sender_name,
              urlAvatar: m.sender_avatar_url || undefined,
            });
          }
        }

        const messagesNormalises: Message[] = messages.map((m) => ({
          id: m.external_id || m.id,
          idExpediteur: m.sender_name,
          nomUtilisateurExpediteur: m.sender_name,
          nomExpediteur: m.sender_name,
          texte: m.content,
          creeLe: m.sent_at,
          plateforme: 'discord' as Plateforme,
        }));

        const dernierMessage = messagesNormalises[messagesNormalises.length - 1];

        return {
          id: idCanal,
          nomFil: messages[0]?.thread_name || idCanal,
          participants: Array.from(carteParticipants.values()),
          messages: messagesNormalises,
          dernierMessage,
          plateforme: 'discord' as Plateforme,
        };
      }
    );

    // Trier par date du dernier message (plus récent en premier)
    filsDiscussion.sort((a, b) => {
      const dateA = a.dernierMessage ? new Date(a.dernierMessage.creeLe).getTime() : 0;
      const dateB = b.dernierMessage ? new Date(b.dernierMessage.creeLe).getTime() : 0;
      return dateB - dateA;
    });

    return { filsDiscussion };
  }

  /**
   * Envoie un message dans un canal Discord via le bot HTTP.
   */
  async envoyerMessage(
    idFil: string,
    texte: string,
    identite?: { nomUtilisateur?: string; urlAvatar?: string }
  ): Promise<Message> {
    const portBot = process.env.BOT_PORT || '3001';

    const reponse = await fetch(`http://localhost:${portBot}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: idFil,
        text: texte,
        userId: this.idUtilisateur,
        username: identite?.nomUtilisateur,
        avatarUrl: identite?.urlAvatar,
      }),
    });

    if (!reponse.ok) {
      const err = await reponse.json().catch(() => ({ error: 'Erreur bot' }));
      throw new Error(err.error || `Erreur bot HTTP ${reponse.status}`);
    }

    const donnees = await reponse.json();
    return {
      id: donnees.message.id,
      idExpediteur: identite?.nomUtilisateur || 'Bot',
      nomUtilisateurExpediteur: identite?.nomUtilisateur || 'Bot',
      nomExpediteur: identite?.nomUtilisateur || 'Bot',
      texte,
      creeLe: donnees.message.sent_at,
      plateforme: 'discord',
    };
  }
}
