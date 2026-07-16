/**
 * Types des plateformes de messagerie supportées.
 */
export type Plateforme = 'twitter' | 'instagram' | 'messenger' | 'threads' | 'discord';

/**
 * Représente un message individuel normalisé dans le système.
 */
export interface Message {
  id: string;
  idExpediteur: string;
  nomUtilisateurExpediteur?: string;
  nomExpediteur?: string;
  texte: string;
  creeLe: string; // Date au format ISO string
  plateforme: Plateforme;
}

/**
 * Représente un participant (interlocuteur ou utilisateur courant).
 */
export interface Participant {
  id: string;
  nomUtilisateur?: string;
  nom?: string;
  urlAvatar?: string;
}

/**
 * Représente une conversation / fil de discussion regroupant des messages.
 */
export interface FilDiscussion {
  id: string;
  nomFil?: string;
  participants: Participant[];
  dernierMessage?: Message;
  messages: Message[];
  plateforme: Plateforme;
}

/**
 * Contrat d'interface pour les fournisseurs de messagerie (ex: Twitter, Discord).
 */
export interface FournisseurMessage {
  /**
   * Récupère le profil public d'un utilisateur de la plateforme.
   */
  obtenirProfil(idUtilisateur: string): Promise<Participant>;

  /**
   * Récupère la liste des fils de discussion (conversations) de l'utilisateur.
   */
  obtenirFilsDiscussion(
    idUtilisateur: string,
    prochainJeton?: string
  ): Promise<{ filsDiscussion: FilDiscussion[]; prochainJeton?: string }>;

  /**
   * Récupère l'historique des messages pour un fil donné.
   */
  obtenirMessages(idUtilisateur: string, idFil: string): Promise<Message[]>;

  /**
   * Envoie un nouveau message dans une conversation.
   */
  envoyerMessage(idUtilisateur: string, idFil: string, texte: string): Promise<Message>;
}

/**
 * Associe une plateforme de messagerie à son préfixe de route d'API interne.
 */
export function obtenirPrefixeApiPlateforme(plateforme: Plateforme): string {
  return plateforme === 'twitter' ? 'x' : plateforme;
}
