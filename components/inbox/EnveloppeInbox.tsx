import React, { useState, useEffect, useCallback } from 'react';
import { Plateforme } from '@/lib/providers/types';
import { useFilsDiscussion } from '@/lib/hooks/useFilsDiscussion';
import { useTempsAttenteApi } from '@/lib/hooks/useTempsAttenteApi';
import { useStatutConnexion } from '@/lib/hooks/useStatutConnexion';
import OngletsPlateformes from './OngletsPlateformes';
import ListeFils from './ListeFils';
import FenetreDiscussion from './FenetreDiscussion';
import BadgeConsommationApi from './BadgeConsommationApi';
import BoutonRafraichir from './BoutonRafraichir';
import DialogueConfirmationEnvoi from './DialogueConfirmationEnvoi';
import ModaleBientotDisponible from '@/components/connections/ModaleBientotDisponible';
import ConnexionX from '@/components/ConnexionX';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * Composant principal de l'Inbox (Shell) orchestrant la disposition globale et la logique de discussion.
 */
export default function EnveloppeInbox() {
  // --- ÉTATS GENERAUX ---
  const [plateformeActive, setPlateformeActive] = useState<Plateforme | 'all'>('all');
  const [idUtilisateur, setIdUtilisateur] = useState<string>('');
  const [compteurGlobalAppels, setCompteurGlobalAppels] = useState<number>(0);
  const [portailEnChargement, setPortailEnChargement] = useState<boolean>(false);
  
  // Fenêtres modales et boîtes de dialogue
  const [nomPlateformeBientotDispo, setNomPlateformeBientotDispo] = useState<string | null>(null);
  const [afficherDialogueConfirmation, setAfficherDialogueConfirmation] = useState<boolean>(false);
  const [texteReponse, setTexteReponse] = useState<string>('');

  // --- INITIALISATION SESSION UTILISATEUR ---
  useEffect(() => {
    const recupererSession = async () => {
      const { creerClient } = await import('@/lib/supabase/client');
      const supabase = creerClient();
      const { data: { user: utilisateur } } = await supabase.auth.getUser();
      if (utilisateur) {
        setIdUtilisateur(utilisateur.id);
      } else {
        window.location.href = '/login';
      }
    };
    recupererSession();
  }, []);

  /**
   * Met à jour le compteur d'utilisation API de la démo.
   */
  const gererMiseAJourConsommationApi = useCallback((compteur: number) => {
    setCompteurGlobalAppels(compteur);
  }, []);

  // --- HOOKS DE SYNC ET DE LOGIQUE ---
  const {
    estConnecte: estXConnecte,
    nomUtilisateur: nomUtilisateurX,
    nom: nomX,
    verifierStatutConnexion
  } = useStatutConnexion(plateformeActive, idUtilisateur, gererMiseAJourConsommationApi);

  const {
    filsDiscussion,
    idFilSelectionne,
    setIdFilSelectionne,
    estEnCoursDeRecuperation,
    estEnCoursDEnvoi,
    prochainJeton,
    erreurConfiguration,
    recupererFilsDiscussion,
    envoyerMessage
  } = useFilsDiscussion(plateformeActive, idUtilisateur, gererMiseAJourConsommationApi);

  const { secondesAttente, demarrerAttente } = useTempsAttenteApi(60);

  // Charger automatiquement les fils lors du montage si l'utilisateur est connecté à X
  useEffect(() => {
    if (idUtilisateur && estXConnecte && filsDiscussion.length === 0) {
      recupererFilsDiscussion(false);
    }
  }, [idUtilisateur, estXConnecte, recupererFilsDiscussion]);

  // --- LOGIQUE DES ACTIONS UTILISATEUR ---
  
  /**
   * Actualise les conversations de l'API externe (Twitter/X).
   */
  const gererRafraichissement = async () => {
    if (secondesAttente > 0 || estEnCoursDeRecuperation || !idUtilisateur) return;
    await recupererFilsDiscussion(false);
    demarrerAttente();
  };

  /**
   * Gère le clic sur le bouton envoyer (ouvre le dialogue de confirmation de facturation).
   */
  const gererClicEnvoi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texteReponse.trim() || estEnCoursDEnvoi) return;
    setAfficherDialogueConfirmation(true);
  };

  /**
   * Confirme l'envoi et transmet le message à l'API externe de messagerie.
   */
  const gererConfirmationEnvoi = async () => {
    if (!idFilSelectionne || !texteReponse.trim() || estEnCoursDEnvoi) return;
    
    setAfficherDialogueConfirmation(false);
    const texteAEnvoyer = texteReponse;
    
    const messageEnvoye = await envoyerMessage(idFilSelectionne, texteAEnvoyer);
    if (messageEnvoye) {
      setTexteReponse('');
    }
  };

  /**
   * Gère le chargement paginé des messages.
   */
  const gererChargerPlus = () => {
    recupererFilsDiscussion(true);
    demarrerAttente();
  };

  /**
   * Ouvre la session du portail client de facturation Stripe.
   */
  const gererPortailFacturation = async () => {
    setPortailEnChargement(true);
    try {
      const reponse = await fetch('/api/stripe/portal', { method: 'POST' });
      const donnees = await reponse.json();
      if (reponse.ok && donnees.url) {
        window.location.href = donnees.url;
      } else {
        alert(donnees.error || "Impossible d'accéder au portail de facturation.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur de connexion est survenue.");
    } finally {
      setPortailEnChargement(false);
    }
  };

  /**
   * Déconnecte l'utilisateur de Supabase Auth.
   */
  const gererDeconnexion = () => {
    window.location.href = '/api/auth/logout';
  };

  const filActif = filsDiscussion.find(t => t.id === idFilSelectionne) || null;
  const plateformeActuelleEnvoi = filActif?.plateforme || 'twitter';
  const utilisateurCourantObj = estXConnecte && nomUtilisateurX ? {
    nomUtilisateur: nomUtilisateurX,
    nom: nomX || `@${nomUtilisateurX}`
  } : null;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#fafafa] font-sans selection:bg-[#27272a] selection:text-white antialiased overflow-hidden">
      
      {/* --- BARRE DE FILTRES SUPÉRIEURE --- */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e24] bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
            MesiComunication
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-zinc-800 text-zinc-400 rounded-full">
            MVP
          </span>
        </div>

        {/* Onglets de sélection des plateformes */}
        <OngletsPlateformes
          plateformeActive={plateformeActive}
          surChanger={setPlateformeActive}
          surClicVerrouille={setNomPlateformeBientotDispo}
        />

        {/* Contrôles utilisateur et compteurs budgétaires */}
        <div className="flex items-center gap-4">
          <button
            onClick={gererPortailFacturation}
            disabled={portailEnChargement}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-[#27272a] hover:bg-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {portailEnChargement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Gérer l'abonnement"}
          </button>
          <BadgeConsommationApi
            plateforme={plateformeActive}
            compteur={compteurGlobalAppels}
          />
          <button
            onClick={gererDeconnexion}
            className="text-xs text-red-400/80 hover:text-red-400 px-3 py-1.5 rounded-lg border border-red-950/40 hover:bg-red-950/20 transition-all cursor-pointer font-medium"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* --- SPLIT DES PANNEAUX INTERFACE --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* BARRE LATÉRALE : LISTE DES CONVERSATIONS */}
        <aside className="w-80 flex flex-col border-r border-[#1e1e24] bg-[#09090b] shrink-0 h-full">
          {/* Widget de connexion Twitter/X */}
          <div className="p-4 border-b border-[#1e1e24] bg-[#121214]/30">
            <ConnexionX 
              idUtilisateur={idUtilisateur}
              estConnecte={estXConnecte}
              nomUtilisateur={nomUtilisateurX}
              estEnCoursDeChargement={estEnCoursDeRecuperation}
            />
          </div>

          {/* Bouton d'action actualiser */}
          <div className="p-4 border-b border-[#1e1e24]">
            <BoutonRafraichir
              plateforme={plateformeActive}
              secondesAttente={secondesAttente}
              estEnCoursDeChargement={estEnCoursDeRecuperation}
              compteurGlobalAppels={compteurGlobalAppels}
              estConnecte={estXConnecte}
              surRafraichir={gererRafraichissement}
            />
          </div>

          {/* Bannière d'erreur API */}
          {erreurConfiguration && (
            <div className="m-3 p-3 bg-red-950/30 border border-red-900/60 rounded-lg flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-200 leading-normal font-sans">
                {erreurConfiguration}
              </div>
            </div>
          )}

          {/* Liste paginée des fils de réception */}
          <div className="flex-1 overflow-y-auto">
            <ListeFils
              fils={filsDiscussion}
              idFilSelectionne={idFilSelectionne}
              utilisateurCourant={utilisateurCourantObj}
              estEnCoursDeChargement={estEnCoursDeRecuperation}
              secondesAttente={secondesAttente}
              compteurGlobalAppels={compteurGlobalAppels}
              prochainJeton={prochainJeton}
              surSelectionnerFil={setIdFilSelectionne}
              surChargerPlus={gererChargerPlus}
            />
          </div>
        </aside>

        {/* CONTAINER CHAT CENTRAL */}
        <main className="flex-1 flex flex-col bg-[#0d0d0f] relative h-full overflow-hidden">
          <FenetreDiscussion
            fil={filActif}
            utilisateurCourant={utilisateurCourantObj}
            texteReponse={texteReponse}
            definirTexteReponse={setTexteReponse}
            estEnCoursDEnvoi={estEnCoursDEnvoi}
            surClicEnvoi={gererClicEnvoi}
          />
        </main>
      </div>

      {/* --- COMPOSANTS DIALOGUES MODAUX --- */}
      {nomPlateformeBientotDispo && (
        <ModaleBientotDisponible
          nomPlateforme={nomPlateformeBientotDispo}
          surFermeture={() => setNomPlateformeBientotDispo(null)}
        />
      )}

      {afficherDialogueConfirmation && filActif && (
        <DialogueConfirmationEnvoi
          plateforme={plateformeActuelleEnvoi}
          texteMessage={texteReponse}
          surConfirmer={gererConfirmationEnvoi}
          surAnnuler={() => setAfficherDialogueConfirmation(false)}
        />
      )}

    </div>
  );
}
