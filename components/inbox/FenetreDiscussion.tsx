import React, { useRef, useEffect } from 'react';
import { User, Send, Loader2, MessageSquare, Hash } from 'lucide-react';
import { FilDiscussion, Participant } from '@/lib/providers/types';
import BulleMessage from './BulleMessage';
import { IconeTwitter, IconeDiscord } from './OngletsPlateformes';

interface ProprietesFenetreDiscussion {
  fil: FilDiscussion | null;
  utilisateurCourant: { nomUtilisateur: string; nom: string; urlAvatar?: string } | null;
  texteReponse: string;
  definirTexteReponse: (texte: string) => void;
  estEnCoursDEnvoi: boolean;
  surClicEnvoi: (e: React.FormEvent) => void;
}

/**
 * Composant de fenêtre de discussion affichant les messages du fil actif et le formulaire d'envoi.
 */
export default function FenetreDiscussion({
  fil,
  utilisateurCourant,
  texteReponse,
  definirTexteReponse,
  estEnCoursDEnvoi,
  surClicEnvoi
}: ProprietesFenetreDiscussion) {
  const refDernierMessage = useRef<HTMLDivElement>(null);

  // Faire défiler automatiquement vers le bas lors de la réception de nouveaux messages
  useEffect(() => {
    refDernierMessage.current?.scrollIntoView({ behavior: 'smooth' });
  }, [fil?.messages]);

  if (!fil) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.4),rgba(9,9,11,1))]">
        <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-6 shadow-xl">
          <MessageSquare className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
          Messagerie SaaS Unifiée
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6">
          Connectez et centralisez vos conversations en temps réel. Sélectionnez un fil de discussion pour démarrer.
        </p>
      </div>
    );
  }

  /**
   * Récupère le profil de l'interlocuteur de la conversation.
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
   * Renvoie le label graphique de la plateforme de messagerie.
   */
  const obtenirLabelPlateforme = () => {
    switch (fil.plateforme) {
      case 'twitter':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/40 text-sky-400 border border-sky-900/60">
            <IconeTwitter className="w-2.5 h-2.5" />
            Twitter/X DM
          </span>
        );
      case 'discord':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-950/40 text-[#5865F2] border border-indigo-900/60">
            <IconeDiscord className="w-2.5 h-2.5" />
            Discord Message
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0f] relative h-full">
      {/* En-tête de la conversation */}
      <div className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between bg-[#0d0d0f]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {fil.plateforme === 'discord' ? (
            <div className="w-8 h-8 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center">
              <Hash className="w-4 h-4 text-[#5865F2]" />
            </div>
          ) : interlocuteur.urlAvatar ? (
            <img
              src={interlocuteur.urlAvatar}
              alt={interlocuteur.nom}
              className="w-8 h-8 rounded-full bg-zinc-800 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              {fil.plateforme === 'discord' ? (fil.nomFil || 'Salon Discord') : interlocuteur.nom}
            </h3>
            {fil.plateforme !== 'discord' && interlocuteur.nomUtilisateur && (
              <p className="text-[10px] text-zinc-500 font-mono">
                @{interlocuteur.nomUtilisateur}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {obtenirLabelPlateforme()}
        </div>
      </div>

      {/* Historique des messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {fil.messages.map(message => {
          const estMoi = utilisateurCourant 
            ? message.idExpediteur === utilisateurCourant.nomUtilisateur || 
              message.nomUtilisateurExpediteur === utilisateurCourant.nomUtilisateur ||
              ((utilisateurCourant as any).nomUtilisateurDiscord && (
                message.idExpediteur === (utilisateurCourant as any).nomUtilisateurDiscord ||
                message.nomUtilisateurExpediteur === (utilisateurCourant as any).nomUtilisateurDiscord
              ))
            : false;
          return (
            <BulleMessage
              key={message.id}
              message={message}
              estMoi={estMoi}
            />
          );
        })}
        <div ref={refDernierMessage} />
      </div>

      {/* Éditeur de message */}
      <div className="p-4 border-t border-[#1e1e24] bg-[#09090b]/80 backdrop-blur-md">
        <form onSubmit={surClicEnvoi} className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative bg-[#18181b] border border-[#27272a] focus-within:border-zinc-500 rounded-xl overflow-hidden transition-colors">
            <textarea
              rows={2}
              value={texteReponse}
              onChange={(e) => definirTexteReponse(e.target.value)}
              placeholder={fil.plateforme === 'discord' ? `Répondre dans ${fil.nomFil || 'le salon'}...` : `Répondre à ${interlocuteur.nom || 'cet utilisateur'}...`}
              className="w-full bg-transparent border-0 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:ring-0 focus:outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  surClicEnvoi(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!texteReponse.trim() || estEnCoursDEnvoi}
            className="p-3 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:border rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
          >
            {estEnCoursDEnvoi ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <div className="text-[10px] text-center text-zinc-500 mt-2 font-mono">
          Appuyez sur Entrée pour envoyer. Une confirmation du coût API sera requise.
        </div>
      </div>
    </div>
  );
}
