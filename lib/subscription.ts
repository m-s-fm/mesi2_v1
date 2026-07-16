import { supabase } from './supabase';

/**
 * Vérifie si un utilisateur possède un abonnement Stripe actif ou d'essai en base de données.
 * Utilise la clé d'administration Supabase pour interroger la table privée des abonnements.
 */
export async function possedeAbonnementActif(idUtilisateur: string): Promise<boolean> {
  if (!idUtilisateur) return false;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', idUtilisateur)
      .maybeSingle();

    if (error) {
      console.error(`Erreur lors de la vérification de l'abonnement pour ${idUtilisateur} :`, error);
      return false;
    }

    if (!data) return false;

    const estStatutActif = data.status === 'active' || data.status === 'trialing';
    const finPeriodeCourante = new Date(data.current_period_end).getTime();
    const nEstPasExpire = finPeriodeCourante > Date.now();

    return estStatutActif && nEstPasExpire;
  } catch (err) {
    console.error(`Exception lors de la vérification de l'abonnement pour ${idUtilisateur} :`, err);
    return false;
  }
}
