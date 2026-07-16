import { useState, useEffect, useCallback } from 'react';
import { Plateforme, obtenirPrefixeApiPlateforme } from '../providers/types';

/**
 * Hook personnalisé pour suivre le statut de connexion d'un compte externe (ex: Twitter/X).
 */
export function useStatutConnexion(
  plateforme: Plateforme | 'all',
  idUtilisateur: string,
  surMiseAJourConsommationApi?: (quantite: number) => void
) {
  const [estConnecte, setEstConnecte] = useState<boolean>(false);
  const [nomUtilisateur, setNomUtilisateur] = useState<string | undefined>(undefined);
  const [nom, setNom] = useState<string | undefined>(undefined);
  const [estEnCoursDeVerification, setEstEnCoursDeVerification] = useState<boolean>(false);

  /**
   * Appelle l'API interne pour obtenir le statut et le nom de l'utilisateur X connecté.
   */
  const verifierStatutConnexion = useCallback(async () => {
    if (!idUtilisateur) return;

    const plateformeCible = plateforme === 'all' ? 'twitter' : plateforme;
    if (plateformeCible !== 'twitter' && plateformeCible !== 'discord') {
      setEstConnecte(false);
      setNomUtilisateur(undefined);
      setNom(undefined);
      return;
    }

    setEstEnCoursDeVerification(true);
    try {
      const prefixeApi = obtenirPrefixeApiPlateforme(plateformeCible);
      
      const reponse = await fetch(`/api/${prefixeApi}/user`);
      const donnees = await reponse.json();
      
      if (donnees.success) {
        setEstConnecte(donnees.connected);
        if (donnees.connected && donnees.user) {
          setNomUtilisateur(donnees.user.username);
          setNom(donnees.user.name);
        } else {
          setNomUtilisateur(undefined);
          setNom(undefined);
        }
        if (donnees.globalApiCallCount !== undefined && surMiseAJourConsommationApi) {
          surMiseAJourConsommationApi(donnees.globalApiCallCount);
        }
      } else {
        setEstConnecte(false);
        setNomUtilisateur(undefined);
        setNom(undefined);
      }
    } catch (erreur) {
      console.error(`Erreur vérification statut connexion pour ${plateformeCible}:`, erreur);
      setEstConnecte(false);
      setNomUtilisateur(undefined);
      setNom(undefined);
    } finally {
      setEstEnCoursDeVerification(false);
    }
  }, [plateforme, idUtilisateur, surMiseAJourConsommationApi]);

  useEffect(() => {
    verifierStatutConnexion();
  }, [verifierStatutConnexion]);

  return {
    estConnecte,
    nomUtilisateur,
    nom,
    estEnCoursDeVerification,
    verifierStatutConnexion,
    setEstConnecte,
    setNomUtilisateur,
    setNom
  };
}
