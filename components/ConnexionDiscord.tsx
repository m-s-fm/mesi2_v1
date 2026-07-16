import React from 'react';
import { User } from 'lucide-react';
import { IconeDiscord } from './inbox/OngletsPlateformes';

interface ProprietesConnexionDiscord {
  idUtilisateur: string;
  estConnecte: boolean;
  nomUtilisateur?: string;
  estEnCoursDeChargement?: boolean;
}

/**
 * Composant de connexion/liaison de compte pour la plateforme Discord.
 */
export default function ConnexionDiscord({ 
  idUtilisateur, 
  estConnecte, 
  nomUtilisateur, 
  estEnCoursDeChargement 
}: ProprietesConnexionDiscord) {
  
  /**
   * Redirige l'utilisateur vers la route d'authentification Discord (OAuth2).
   */
  const gererConnexion = () => {
    window.location.href = `/api/discord/auth`;
  };

  if (estConnecte && nomUtilisateur) {
    return (
      <div className="flex items-center gap-3 w-full border-t border-[#1e1e24] pt-4 mt-4">
        <div className="w-9 h-9 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-indigo-400">@{nomUtilisateur[0]?.toUpperCase()}</span>
        </div>
        <div className="overflow-hidden flex-1">
          <h4 className="text-xs font-semibold text-zinc-200 truncate">Connecté à Discord</h4>
          <p className="text-[10px] text-zinc-500 font-mono truncate">@{nomUtilisateur}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Session Discord active"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full border-t border-[#1e1e24] pt-4 mt-4">
      <div className="flex items-center gap-2.5 text-zinc-500">
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-dashed border-zinc-850 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-zinc-600" />
        </div>
        <div>
          <h4 className="text-xs font-medium text-zinc-400">Statut Discord</h4>
          <p className="text-[10px] text-zinc-500 font-mono">Compte Discord non lié</p>
        </div>
      </div>
      <button
        onClick={gererConnexion}
        disabled={estEnCoursDeChargement || !idUtilisateur}
        className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
      >
        <IconeDiscord className="w-3.5 h-3.5 fill-current" />
        Lier mon compte Discord
      </button>
    </div>
  );
}
