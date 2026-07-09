import React from 'react';
import { User } from 'lucide-react';

interface XConnectProps {
  userId: string;
  isConnected: boolean;
  username?: string;
  isFetching?: boolean;
}

export default function XConnect({ userId, isConnected, username, isFetching }: XConnectProps) {
  const handleConnect = () => {
    if (!userId) {
      alert("Erreur: Aucun identifiant utilisateur local détecté.");
      return;
    }
    // Rediriger vers la route d'authentification avec l'UUID de l'utilisateur
    window.location.href = `/api/x/auth?user_id=${userId}`;
  };

  if (isConnected && username) {
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="w-9 h-9 rounded-full bg-sky-950/40 border border-sky-900/60 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-sky-400">@{username[0]?.toUpperCase()}</span>
        </div>
        <div className="overflow-hidden flex-1">
          <h4 className="text-xs font-semibold text-zinc-200 truncate">Connecté à Twitter</h4>
          <p className="text-[10px] text-zinc-500 font-mono truncate">@{username}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Session X active"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-2.5 text-zinc-500">
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-dashed border-zinc-850 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-zinc-600" />
        </div>
        <div>
          <h4 className="text-xs font-medium text-zinc-400">Status Twitter</h4>
          <p className="text-[10px] text-zinc-500 font-mono">Compte X non lié</p>
        </div>
      </div>
      <button
        onClick={handleConnect}
        disabled={isFetching || !userId}
        className="w-full py-2 px-3 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Lier mon compte X
      </button>
    </div>
  );
}
