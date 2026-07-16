'use client';

import React, { useState } from 'react';
import { CreditCard, Check, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

/**
 * Composant de la page de Tarification (mur d'abonnement).
 */
export default function PageTarification() {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Appelle l'API Stripe Checkout locale pour initier la session d'abonnement.
   */
  const gererAbonnement = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });
      const donnees = await reponse.json();

      if (reponse.ok && donnees.url) {
        window.location.href = donnees.url;
      } else {
        throw new Error(donnees.error || "Impossible d'initier le paiement Stripe.");
      }
    } catch (err: any) {
      console.error(err);
      setErreur(err.message || 'Une erreur est survenue lors de la redirection vers Stripe.');
    } finally {
      setChargement(false);
    }
  };

  /**
   * Déconnecte l'utilisateur de l'application.
   */
  const gererDeconnexion = async () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between selection:bg-[#27272a] selection:text-white antialiased">
      {/* En-tête supérieur */}
      <header className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between bg-[#09090b]/80 backdrop-blur-md">
        <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
          MesiComunication
        </span>
        <button
          onClick={gererDeconnexion}
          className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-[#27272a] hover:bg-zinc-900 transition-all cursor-pointer"
        >
          Déconnexion
        </button>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.3),rgba(9,9,11,1))]">
        <div className="max-w-md w-full relative z-10 flex flex-col items-center">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 sm:text-4xl bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Accès premium requis
            </h1>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto">
              Rejoignez le plan premium MesiComunication pour centraliser vos discussions professionnelles.
            </p>
          </div>

          {/* Carte d'offre */}
          <div className="w-full bg-[#0f0f11] border border-[#27272a] rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-zinc-700/80">
            {/* Halo lumineux d'arrière-plan */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-white text-black rounded-full">
                Plan Unique
              </span>
              <div className="flex items-center gap-1 text-zinc-500">
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium font-mono">Paiement sécurisé Stripe</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">9,99 €</span>
                <span className="text-xs text-zinc-500 font-medium">/ mois</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Accès complet et sans engagement.</p>
            </div>

            {/* Bannière d'erreur */}
            {erreur && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-900/60 rounded-xl flex gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-red-200 leading-normal">{erreur}</span>
              </div>
            )}

            {/* Liste des avantages */}
            <ul className="space-y-3 mb-8">
              {[
                "Centralisation de vos messages Twitter/X",
                "Intégrations futures prévues (Discord, Instagram)",
                "Contrôle budgétaire d'API strict (Zéro surfacturation)",
                "Cryptage des sessions client AES-256-GCM",
                "Support prioritaire premium"
              ].map((avantage, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <span>{avantage}</span>
                </li>
              ))}
            </ul>

            {/* Bouton d'action */}
            <button
              onClick={gererAbonnement}
              disabled={chargement}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
            >
              {chargement ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  Commencer l'abonnement
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="py-6 border-t border-[#1e1e24] text-center text-[10px] text-zinc-500">
        &copy; {new Date().getFullYear()} MesiComunication. Tous droits réservés.
      </footer>
    </div>
  );
}
