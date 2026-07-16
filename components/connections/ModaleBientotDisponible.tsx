import React from 'react';
import { Lock } from 'lucide-react';

interface ProprietesModaleBientotDisponible {
  nomPlateforme: string;
  surFermeture: () => void;
}

/**
 * Modale d'avertissement pour les plateformes non implémentées.
 */
export default function ModaleBientotDisponible({ 
  nomPlateforme, 
  surFermeture 
}: ProprietesModaleBientotDisponible) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f11] border border-[#27272a] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>
        
        <div className="w-12 h-12 bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-white mb-2">
          Intégration {nomPlateforme} bientôt disponible
        </h3>
        
        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          Nous finalisons l'intégration de l'API de {nomPlateforme}. Cette fonctionnalité sera disponible dans la prochaine mise à jour de la plateforme.
        </p>

        <button
          onClick={surFermeture}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          D'accord
        </button>
      </div>
    </div>
  );
}
