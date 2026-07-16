'use client';

import React, { useState } from 'react';
import { creerClient } from '@/lib/supabase/client';
import { Mail, Lock, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

/**
 * Composant de page de Connexion / Inscription à l'application.
 */
export default function PageConnexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [estInscription, setEstInscription] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);

  /**
   * Envoie les données de connexion ou d'inscription à Supabase Auth.
   */
  const gererAuthentification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !motDePasse) return;

    setChargement(true);
    setErreur(null);
    setMessageSucces(null);

    const clientSupabase = creerClient();

    try {
      if (estInscription) {
        const { data, error: erreurInscription } = await clientSupabase.auth.signUp({
          email,
          password: motDePasse,
        });

        if (erreurInscription) throw erreurInscription;

        // Si la confirmation par email est active, informer l'utilisateur. Sinon, connexion directe.
        if (data.session) {
          window.location.href = '/';
        } else {
          setMessageSucces("Compte créé ! Veuillez vérifier votre boîte mail pour confirmer votre inscription.");
        }
      } else {
        const { error: erreurConnexion } = await clientSupabase.auth.signInWithPassword({
          email,
          password: motDePasse,
        });

        if (erreurConnexion) throw erreurConnexion;

        window.location.href = '/';
      }
    } catch (err: any) {
      console.error(err);
      setErreur(err.message || "Une erreur d'authentification est survenue.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between selection:bg-[#27272a] selection:text-white antialiased">
      {/* En-tête supérieur */}
      <header className="px-6 py-4 border-b border-[#1e1e24] flex items-center bg-[#09090b]/80 backdrop-blur-md">
        <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
          MesiComunication
        </span>
      </header>

      {/* Formulaire d'authentification */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.3),rgba(9,9,11,1))]">
        <div className="max-w-md w-full relative z-10">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2 sm:text-3xl bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              {estInscription ? "Créer un compte" : "Bon retour parmi nous"}
            </h1>
            <p className="text-xs text-zinc-400">
              {estInscription 
                ? "Inscrivez-vous pour centraliser vos messageries en quelques clics." 
                : "Connectez-vous pour accéder à votre interface de messagerie."}
            </p>
          </div>

          <div className="bg-[#0f0f11] border border-[#27272a] rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
            {/* Halo lumineux d'arrière-plan */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Bannière d'erreur */}
            {erreur && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-900/60 rounded-xl flex gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-red-200 leading-normal">{erreur}</span>
              </div>
            )}

            {/* Bannière de succès */}
            {messageSucces && (
              <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl flex gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse"></span>
                <span className="text-[11px] text-emerald-200 leading-normal">{messageSucces}</span>
              </div>
            )}

            <form onSubmit={gererAuthentification} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Adresse Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@example.com"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Mot de Passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={chargement}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
              >
                {chargement ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    {estInscription ? "S'inscrire" : "Se connecter"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Inscription / Connexion */}
            <div className="mt-6 text-center text-xs">
              <span className="text-zinc-500">
                {estInscription ? "Vous avez déjà un compte ?" : "Nouveau sur la plateforme ?"}
              </span>{' '}
              <button
                onClick={() => {
                  setEstInscription(!estInscription);
                  setErreur(null);
                  setMessageSucces(null);
                }}
                className="text-white hover:underline font-semibold cursor-pointer"
              >
                {estInscription ? "Se connecter" : "Créer un compte"}
              </button>
            </div>

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
