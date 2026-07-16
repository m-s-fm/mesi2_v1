import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer un temps d'attente (cooldown) de sécurité après un appel API.
 */
export function useTempsAttenteApi(dureeSecondes: number = 60) {
  const [secondesAttente, setSecondesAttente] = useState<number>(0);

  useEffect(() => {
    if (secondesAttente <= 0) return;

    const intervalle = setInterval(() => {
      setSecondesAttente(prev => {
        if (prev <= 1) {
          clearInterval(intervalle);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalle);
  }, [secondesAttente]);

  /**
   * Déclenche le compte à rebours de l'attente.
   */
  const demarrerAttente = useCallback(() => {
    setSecondesAttente(dureeSecondes);
  }, [dureeSecondes]);

  return {
    secondesAttente,
    demarrerAttente
  };
}
