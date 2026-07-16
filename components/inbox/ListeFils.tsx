import React from 'react';
import { Inbox, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { FilDiscussion } from '@/lib/providers/types';
import ElementListeFils from './ElementListeFils';

interface ProprietesListeFils {
  fils: FilDiscussion[];
  idFilSelectionne: string | null;
  utilisateurCourant: { nomUtilisateur: string; nom: string; urlAvatar?: string } | null;
  estEnCoursDeChargement: boolean;
  secondesAttente: number;
  compteurGlobalAppels: number;
  prochainJeton: string | null;
  surSelectionnerFil: (id: string) => void;
  surChargerPlus: () => void;
}

/**
 * Composant de liste affichant l'intégralité des conversations récupérées.
 */
export default function ListeFils({
  fils,
  idFilSelectionne,
  utilisateurCourant,
  estEnCoursDeChargement,
  secondesAttente,
  compteurGlobalAppels,
  prochainJeton,
  surSelectionnerFil,
  surChargerPlus
}: ProprietesListeFils) {
  const estLimiteAtteinte = compteurGlobalAppels >= 150;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col justify-between h-full">
      <div className="flex-1">
        <div className="px-4 py-3 flex items-center justify-between text-zinc-500">
          <span className="text-[10px] font-bold uppercase tracking-wider">Conversations</span>
          <span className="text-xs font-mono">({fils.length})</span>
        </div>

        {fils.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-zinc-500">
            <Inbox className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs leading-normal">
              Aucun message chargé dans cette session.
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Cliquez sur "Rafraîchir" ci-dessus pour interroger les serveurs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#121214]">
            {fils.map(fil => (
              <ElementListeFils
                key={fil.id}
                fil={fil}
                estSelectionne={fil.id === idFilSelectionne}
                utilisateurCourant={utilisateurCourant}
                onClick={() => surSelectionnerFil(fil.id)}
              />
            ))}
          </div>
        )}
      </div>

      {fils.length > 0 && prochainJeton && (
        <div className="p-4 border-t border-[#1e1e24] bg-[#09090b]">
          <button
            onClick={surChargerPlus}
            disabled={secondesAttente > 0 || estEnCoursDeChargement || estLimiteAtteinte}
            className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
              secondesAttente > 0 || estLimiteAtteinte
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white cursor-pointer'
            }`}
          >
            {estEnCoursDeChargement ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Chargement...
              </>
            ) : estLimiteAtteinte ? (
              "Quota global atteint"
            ) : secondesAttente > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Charger plus ({secondesAttente}s)
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5 text-white" />
                Charger les 5 suivants
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
