import React from 'react';
import { User } from 'lucide-react';
import { FilDiscussion, Participant } from '@/lib/providers/types';
import { IconeTwitter, IconeDiscord } from './OngletsPlateformes';

interface ProprietesElementListeFils {
  fil: FilDiscussion;
  estSelectionne: boolean;
  utilisateurCourant: { nomUtilisateur: string; nom: string; urlAvatar?: string } | null;
  onClick: () => void;
}

/**
 * Composant représentant un élément individuel de conversation dans la barre latérale.
 */
export default function ElementListeFils({
  fil,
  estSelectionne,
  utilisateurCourant,
  onClick
}: ProprietesElementListeFils) {
  
  /**
   * Extrait le profil de l'interlocuteur de la conversation (qui n'est pas l'utilisateur connecté).
   */
  const obtenirInterlocuteur = (f: FilDiscussion): Participant => {
    if (!utilisateurCourant) return f.participants[0] || { id: 'unknown', nom: 'Utilisateur' };
    const interlocuteur = f.participants.find(p => 
      p.nomUtilisateur !== utilisateurCourant.nomUtilisateur &&
      p.nomUtilisateur !== (utilisateurCourant as any).nomUtilisateurDiscord
    );
    return interlocuteur || f.participants[0] || { id: 'unknown', nom: 'Utilisateur' };
  };

  const interlocuteur = obtenirInterlocuteur(fil);

  /**
   * Formate la date de manière lisible (Heure si aujourd'hui, sinon Jour/Mois).
   */
  const formaterDate = (chaineDate: string) => {
    try {
      const date = new Date(chaineDate);
      const maintenant = new Date();
      if (date.toDateString() === maintenant.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  /**
   * Renvoie l'icône appropriée pour la plateforme de messagerie du fil.
   */
  const obtenirIconePlateforme = () => {
    switch (fil.plateforme) {
      case 'twitter':
        return <IconeTwitter className="w-2.5 h-2.5 text-sky-400" />;
      case 'discord':
        return <IconeDiscord className="w-2.5 h-2.5 text-[#5865F2]" />;
      default:
        return null;
    }
  };

  const estDiscord = fil.plateforme === 'discord';
  const titreAffichage = estDiscord
    ? (fil.nomFil || 'Canal Discord')
    : (interlocuteur.nom || `Utilisateur ${interlocuteur.id}`);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 flex gap-3 transition-colors cursor-pointer ${
        estSelectionne
          ? 'bg-[#18181b] border-l-2 border-white'
          : 'hover:bg-[#121214]/50'
      }`}
    >
      {/* Avatar de l'interlocuteur ou icône salon Discord */}
      {estDiscord ? (
        <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center shrink-0">
          <span className="text-indigo-400 font-bold text-lg">#</span>
        </div>
      ) : interlocuteur.urlAvatar ? (
        <img
          src={interlocuteur.urlAvatar}
          alt={interlocuteur.nom}
          className="w-10 h-10 rounded-full bg-zinc-800 shrink-0 object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-zinc-400" />
        </div>
      )}

      {/* Aperçu du fil */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <h4 className="text-xs font-semibold text-zinc-200 truncate pr-1">
            {titreAffichage}
          </h4>
          {fil.dernierMessage && (
            <span className="text-[9px] text-zinc-500 font-mono shrink-0">
              {formaterDate(fil.dernierMessage.creeLe)}
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 truncate leading-snug">
          {fil.dernierMessage ? (
            estDiscord ? (
              <>
                <span className="text-zinc-500">{fil.dernierMessage.nomUtilisateurExpediteur || fil.dernierMessage.idExpediteur}: </span>
                {fil.dernierMessage.texte}
              </>
            ) : (
              fil.dernierMessage.texte
            )
          ) : "Aucun message"}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          {obtenirIconePlateforme()}
          {!estDiscord && interlocuteur.nomUtilisateur && (
            <span className="text-[9px] text-zinc-500 font-mono">@{interlocuteur.nomUtilisateur}</span>
          )}
        </div>
      </div>
    </button>
  );
}
