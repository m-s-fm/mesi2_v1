import React from 'react';
import { Plateforme } from '@/lib/providers/types';

interface ProprietesBadgeConsommationApi {
  plateforme: Plateforme | 'all';
  compteur: number;
}

/**
 * Badge affichant l'état de la consommation budgétaire des API (avec limite de 150 pour Twitter).
 */
export default function BadgeConsommationApi({ plateforme, compteur }: ProprietesBadgeConsommationApi) {
  const plateformeCible = plateforme === 'all' ? 'twitter' : plateforme;
  const estTwitter = plateformeCible === 'twitter';
  const limite = estTwitter ? 150 : null;
  const estLimiteAtteinte = limite !== null && compteur >= limite;

  return (
    <div className={`flex items-center gap-2 bg-[#18181b] px-3.5 py-1.5 rounded-lg border ${
      estLimiteAtteinte ? 'border-red-900/60 text-red-400' : 'border-[#27272a]'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        estLimiteAtteinte ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
      }`}></span>
      <span className="text-xs font-mono text-zinc-400">
        {estLimiteAtteinte ? (
          <strong className="text-red-400 font-bold">Quota API atteint ({limite}/{limite})</strong>
        ) : (
          <>
            Appels API {estTwitter ? 'X (Twitter)' : 'Globaux'} : <strong className="text-white font-bold">{compteur}{limite !== null ? ` / ${limite}` : ''}</strong>
          </>
        )}
      </span>
    </div>
  );
}
