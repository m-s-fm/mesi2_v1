import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Plateforme } from '@/lib/providers/types';
import { IconeDiscord } from './OngletsPlateformes';

interface ProprietesDialogueConfirmationEnvoi {
  plateforme: Plateforme;
  texteMessage: string;
  surConfirmer: () => void;
  surAnnuler: () => void;
}

/**
 * Boîte de dialogue de confirmation avant l'envoi d'un message.
 */
export default function DialogueConfirmationEnvoi({
  plateforme,
  texteMessage,
  surConfirmer,
  surAnnuler
}: ProprietesDialogueConfirmationEnvoi) {
  const estTwitter = plateforme === 'twitter';
  const estDiscord = plateforme === 'discord';
  const nomPlateforme = estTwitter ? 'X (Twitter)' : plateforme.charAt(0).toUpperCase() + plateforme.slice(1);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f11] border border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Barre de couleur contextuelle */}
        <div className={`absolute top-0 left-0 w-full h-[3px] ${estDiscord ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
        
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            estDiscord
              ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/60'
              : 'bg-amber-950/40 text-amber-500 border border-amber-900/60'
          }`}>
            {estDiscord ? (
              <IconeDiscord className="w-5 h-5 fill-current" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-2">
              {estDiscord ? 'Envoyer ce message Discord ?' : "Confirmer l'envoi facturé ?"}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {estDiscord
                ? 'Le message sera envoyé dans le salon Discord sélectionné.'
                : `Chaque message envoyé effectue une requête d'écriture sur l'API ${nomPlateforme} payante. Cet envoi vous sera comptabilisé.`}
            </p>

            {/* Aperçu du message à envoyer */}
            <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-900/60 mb-6">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Aperçu du message :</span>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
                {texteMessage}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={surAnnuler}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={surConfirmer}
                className={`flex-1 py-2 font-bold text-xs rounded-lg transition-colors shadow-lg cursor-pointer ${
                  estDiscord
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-white hover:bg-zinc-200 text-black'
                }`}
              >
                {estDiscord ? 'Envoyer' : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
