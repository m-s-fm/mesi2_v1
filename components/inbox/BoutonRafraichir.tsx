import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Plateforme } from '@/lib/providers/types';

interface ProprietesBoutonRafraichir {
  plateforme: Plateforme | 'all';
  secondesAttente: number;
  estEnCoursDeChargement: boolean;
  compteurGlobalAppels: number;
  estConnecte: boolean;
  surRafraichir: () => void;
}

/**
 * Bouton de synchronisation manuelle des messages avec gestion du cooldown et des quotas.
 */
export default function BoutonRafraichir({
  plateforme,
  secondesAttente,
  estEnCoursDeChargement,
  compteurGlobalAppels,
  estConnecte,
  surRafraichir
}: ProprietesBoutonRafraichir) {
  const plateformeCible = plateforme === 'all' ? 'twitter' : plateforme;
  const estTwitter = plateformeCible === 'twitter';
  const limite = estTwitter ? 150 : null;
  const estLimiteAtteinte = limite !== null && compteurGlobalAppels >= limite;

  /**
   * Retourne le texte dynamique affiché à l'intérieur du bouton selon l'état de l'application.
   */
  const obtenirTexteBouton = () => {
    if (estEnCoursDeChargement) return "Chargement...";
    if (estLimiteAtteinte) return "Quota API atteint (Démo)";
    if (!estConnecte) {
      const nomAffiche = estTwitter ? 'X' : plateformeCible.charAt(0).toUpperCase() + plateformeCible.slice(1);
      return `Liez votre compte ${nomAffiche} d'abord`;
    }
    if (secondesAttente > 0) return `Rafraîchir (${secondesAttente}s)`;
    if (plateformeCible === 'discord') return "Rafraîchir les salons Discord";
    return `Rafraîchir les messages ${estTwitter ? 'X' : plateformeCible.charAt(0).toUpperCase() + plateformeCible.slice(1)}`;
  };

  const estDesactive = secondesAttente > 0 || estEnCoursDeChargement || estLimiteAtteinte || !estConnecte;

  return (
    <button
      onClick={surRafraichir}
      disabled={estDesactive}
      className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
        estDesactive
          ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
          : 'bg-white hover:bg-zinc-200 text-black shadow-lg font-bold cursor-pointer'
      }`}
    >
      {estEnCoursDeChargement ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : secondesAttente > 0 ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      <span>{obtenirTexteBouton()}</span>
    </button>
  );
}
