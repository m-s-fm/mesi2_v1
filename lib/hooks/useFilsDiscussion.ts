import { useState, useEffect, useCallback } from 'react';
import { FilDiscussion, Message, Plateforme, obtenirPrefixeApiPlateforme } from '../providers/types';

/**
 * Hook personnalisé pour gérer l'état des conversations (fils de discussion) et l'envoi de messages.
 */
export function useFilsDiscussion(
  plateforme: Plateforme | 'all',
  idUtilisateur: string,
  surMiseAJourConsommationApi?: (quantite: number) => void
) {
  const [filsDiscussion, setFilsDiscussion] = useState<FilDiscussion[]>([]);
  const [idFilSelectionne, setIdFilSelectionne] = useState<string | null>(null);
  const [estEnCoursDeRecuperation, setEstEnCoursDeRecuperation] = useState(false);
  const [estEnCoursDEnvoi, setEstEnCoursDEnvoi] = useState(false);
  const [prochainJeton, setProchainJeton] = useState<string | null>(null);
  const [erreurConfiguration, setErreurConfiguration] = useState<string | null>(null);

  /**
   * Récupère la liste des conversations (fils) pour l'utilisateur connecté.
   */
  const recupererFilsDiscussion = useCallback(async (chargerPlus: boolean = false) => {
    if (!idUtilisateur) return;

    let routes: string[] = [];
    if (plateforme === 'all') {
      routes.push('x');
      routes.push('discord');
    } else if (plateforme === 'twitter') {
      routes.push('x');
    } else if (plateforme === 'discord') {
      routes.push('discord');
    } else {
      setFilsDiscussion([]);
      setIdFilSelectionne(null);
      setProchainJeton(null);
      return;
    }

    setEstEnCoursDeRecuperation(true);
    setErreurConfiguration(null);

    try {
      const parametreJeton = chargerPlus && prochainJeton ? `&nextToken=${prochainJeton}` : '';
      
      const requetes = routes.map(async (prefixeApi) => {
        try {
          const reponse = await fetch(`/api/${prefixeApi}/messages?${parametreJeton}`);
          if (!reponse.ok) return [];
          const donnees = await reponse.json();
          return donnees.success ? (donnees.filsDiscussion || []) : [];
        } catch {
          return [];
        }
      });

      const listesFils = await Promise.all(requetes);
      const nouveauxFils = listesFils.flat();

      // Trier les nouveaux fils par date du dernier message pour conserver la chronologie
      nouveauxFils.sort((a, b) => {
        const dateA = a.dernierMessage ? new Date(a.dernierMessage.creeLe).getTime() : 0;
        const dateB = b.dernierMessage ? new Date(b.dernierMessage.creeLe).getTime() : 0;
        return dateB - dateA;
      });

      if (chargerPlus) {
        setFilsDiscussion(prev => {
          const fusionne = fusionnerFilsDiscussion(prev, nouveauxFils);
          if (fusionne.length > 0 && !idFilSelectionne) {
            setIdFilSelectionne(fusionne[0].id);
          }
          return fusionne;
        });
      } else {
        setFilsDiscussion(nouveauxFils);
        if (nouveauxFils.length > 0 && !idFilSelectionne) {
          setIdFilSelectionne(nouveauxFils[0].id);
        }
      }
      
      // Récupérer le compteur global depuis Twitter (notre unique compteur payant)
      try {
        const reponseBudget = await fetch(`/api/x/user`);
        const donneesBudget = await reponseBudget.json();
        if (donneesBudget.success && donneesBudget.globalApiCallCount !== undefined && surMiseAJourConsommationApi) {
          surMiseAJourConsommationApi(donneesBudget.globalApiCallCount);
        }
      } catch {}

    } catch (err: any) {
      console.error(`Error fetching threads for ${plateforme}:`, err);
      setErreurConfiguration(err.message || "Une erreur est survenue.");
    } finally {
      setEstEnCoursDeRecuperation(false);
    }
  }, [plateforme, idUtilisateur, prochainJeton, idFilSelectionne, surMiseAJourConsommationApi]);

  /**
   * Envoie un nouveau message dans une conversation donnée.
   */
  const envoyerMessage = useCallback(async (idFil: string, texte: string) => {
    if (!idUtilisateur || !idFil || !texte.trim()) return null;
    setEstEnCoursDEnvoi(true);

    try {
      const filCible = filsDiscussion.find(f => f.id === idFil);
      const plateformeCible = filCible ? filCible.plateforme : (plateforme === 'all' ? 'twitter' : plateforme);
      const prefixeApi = obtenirPrefixeApiPlateforme(plateformeCible);
      
      const reponse = await fetch(`/api/${prefixeApi}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: idFil, text: texte })
      });
      const donnees = await reponse.json();

      if (donnees.success && donnees.message) {
        setFilsDiscussion(prevFils => 
          prevFils.map(fil => {
            if (fil.id === idFil) {
              const messagesMisAJour = [...fil.messages, donnees.message];
              return {
                ...fil,
                messages: messagesMisAJour,
                dernierMessage: donnees.message
              };
            }
            return fil;
          })
        );
        if (donnees.globalApiCallCount !== undefined && surMiseAJourConsommationApi) {
          surMiseAJourConsommationApi(donnees.globalApiCallCount);
        }
        return donnees.message;
      } else {
        throw new Error(donnees.error || "Impossible d'envoyer le message.");
      }
    } catch (err: any) {
      console.error(`Error sending message on ${plateforme}:`, err);
      alert(err.message || "Erreur de connexion lors de l'envoi.");
      return null;
    } finally {
      setEstEnCoursDEnvoi(false);
    }
  }, [plateforme, idUtilisateur, surMiseAJourConsommationApi, filsDiscussion]);

  // Réinitialiser la sélection de conversation au changement de plateforme active
  useEffect(() => {
    setFilsDiscussion([]);
    setIdFilSelectionne(null);
    setProchainJeton(null);
    setErreurConfiguration(null);
  }, [plateforme]);

  return {
    filsDiscussion,
    idFilSelectionne,
    setIdFilSelectionne,
    estEnCoursDeRecuperation,
    estEnCoursDEnvoi,
    prochainJeton,
    erreurConfiguration,
    recupererFilsDiscussion,
    envoyerMessage,
    setFilsDiscussion
  };
}

/**
 * Fusionne les conversations existantes avec les nouvelles récupérées via la pagination.
 */
function fusionnerFilsDiscussion(existants: FilDiscussion[], nouveaux: FilDiscussion[]): FilDiscussion[] {
  const carteFusionnee = new Map<string, FilDiscussion>();
  for (const f of existants) {
    carteFusionnee.set(f.id, { ...f, messages: [...f.messages] });
  }
  for (const nouv of nouveaux) {
    if (carteFusionnee.has(nouv.id)) {
      const filExistant = carteFusionnee.get(nouv.id)!;
      const tousMessages = [...filExistant.messages, ...nouv.messages];
      const carteMessagesUniques = new Map<string, Message>();
      for (const m of tousMessages) {
        carteMessagesUniques.set(m.id, m);
      }
      const messagesUniques = Array.from(carteMessagesUniques.values());
      messagesUniques.sort((a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime());
      
      const carteParticipants = new Map();
      for (const p of [...filExistant.participants, ...nouv.participants]) {
        carteParticipants.set(p.id, p);
      }
      
      carteFusionnee.set(nouv.id, {
        ...filExistant,
        participants: Array.from(carteParticipants.values()),
        messages: messagesUniques,
        dernierMessage: messagesUniques[messagesUniques.length - 1]
      });
    } else {
      carteFusionnee.set(nouv.id, nouv);
    }
  }
  const resultat = Array.from(carteFusionnee.values());
  resultat.sort((a, b) => {
    const dateA = a.dernierMessage ? new Date(a.dernierMessage.creeLe).getTime() : 0;
    const dateB = b.dernierMessage ? new Date(b.dernierMessage.creeLe).getTime() : 0;
    return dateB - dateA;
  });
  return resultat;
}
