import React from 'react';
import { Inbox, Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { FilDiscussion, Plateforme } from '@/lib/providers/types';
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
  plateformeActive: Plateforme | 'all';
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
  surChargerPlus,
  plateformeActive
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
        ) : plateformeActive === 'discord' ? (
          // ── MODE DISCORD : groupement par serveur ──────────────────
          (() => {
            const serverMap = new Map<string, FilDiscussion[]>();
            for (const fil of fils) {
              const nomComplet = fil.nomFil || fil.id;
              const nomServeur = nomComplet.includes(' > #')
                ? nomComplet.split(' > #')[0]
                : 'Serveur Discord';
              if (!serverMap.has(nomServeur)) serverMap.set(nomServeur, []);
              serverMap.get(nomServeur)!.push(fil);
            }

            return Array.from(serverMap.entries()).map(([nomServeur, filsServeur]) => (
              <div key={nomServeur} className="mb-2">
                {/* En-tête serveur */}
                <div className="px-4 py-2 flex items-center gap-2 bg-indigo-950/20 border-y border-indigo-900/30">
                  <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 127.14 96.36" fill="currentColor">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53a105.73,105.73,0,0,0,32,16.15,86,86,0,0,0,6.77-11A68.06,68.06,0,0,1,28.66,77.53c.95-.7,1.89-1.44,2.79-2.2a75.76,75.76,0,0,0,71.38,0c.9,1.1,1.84,1.84,2.79,2.2a67.86,67.86,0,0,1-11.07,5.15,86,86,0,0,0,6.77,11,105.73,105.73,0,0,0,32-16.15C129,54.65,122.56,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 truncate">{nomServeur}</span>
                  <span className="text-[9px] text-indigo-500 ml-auto font-mono">{filsServeur.length} salon{filsServeur.length > 1 ? 's' : ''}</span>
                </div>

                {/* Salons du serveur */}
                <div className="divide-y divide-[#121214]">
                  {filsServeur.map(fil => {
                    const isSelected = fil.id === idFilSelectionne;
                    const channelName = (fil.nomFil || fil.id).includes(' > #')
                      ? (fil.nomFil || fil.id).split(' > #')[1]
                      : (fil.nomFil || fil.id);

                    return (
                      <button
                        key={fil.id}
                        onClick={() => surSelectionnerFil(fil.id)}
                        className={`w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/30 border-l-2 border-indigo-400'
                            : 'hover:bg-[#121214]/50'
                        }`}
                      >
                        {/* Icône salon */}
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center shrink-0">
                          <span className="text-indigo-400 font-bold text-sm">#</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <h4 className="text-xs font-semibold text-zinc-200 truncate pr-1">#{channelName}</h4>
                            {fil.dernierMessage && (
                              <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                                {new Date(fil.dernierMessage.creeLe).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate leading-snug">
                            {fil.dernierMessage
                              ? <><span className="text-zinc-500">{fil.dernierMessage.nomUtilisateurExpediteur || fil.dernierMessage.idExpediteur}: </span>{fil.dernierMessage.texte}</>
                              : 'Aucun message'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()
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
