import { supabase } from './supabase';
import { Plateforme } from './providers/types';

/**
 * Limites d'appels API définies par plateforme.
 */
export const LIMITES_PLATEFORME: Record<Plateforme, number | null> = {
  twitter: 150,
  instagram: null,
  messenger: null,
  threads: null,
  discord: null
};

/**
 * Récupère le compteur global actuel de consommation d'API pour une plateforme spécifique.
 * Utilise la table `x_api_usage` pour X (Twitter).
 */
export async function obtenirConsommationApi(plateforme: Plateforme): Promise<number> {
  try {
    if (plateforme !== 'twitter') {
      return 0; // Les autres plateformes ne sont pas encore actives
    }

    const { data, error } = await supabase
      .from('x_api_usage')
      .select('count')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error(`Erreur lors de la récupération de la consommation d'API pour ${plateforme} :`, error);
      return 0;
    }

    if (!data) {
      // Si aucune ligne n'existe, on initialise le compteur à 0
      const { data: nouvelleLigne } = await supabase
        .from('x_api_usage')
        .insert({ id: 1, count: 0 })
        .select('count')
        .single();
      return nouvelleLigne?.count || 0;
    }

    return data.count;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

/**
 * Vérifie si le nombre d'appels API demandé respecte le budget restant pour la plateforme.
 */
export async function verifierBudget(
  plateforme: Plateforme,
  quantite: number = 1
): Promise<{ autorise: boolean; consommationActuelle: number; limite: number | null }> {
  const consommationActuelle = await obtenirConsommationApi(plateforme);
  const limite = LIMITES_PLATEFORME[plateforme];

  if (limite !== null && consommationActuelle + quantite > limite) {
    return { autorise: false, consommationActuelle, limite };
  }

  return { autorise: true, consommationActuelle, limite };
}

/**
 * Incrémente le compteur d'utilisation de l'API pour une plateforme donnée.
 */
export async function incrementerBudget(
  plateforme: Plateforme,
  quantite: number = 1
): Promise<{ consommationActuelle: number }> {
  try {
    if (plateforme !== 'twitter') {
      return { consommationActuelle: 0 };
    }

    const consommationActuelle = await obtenirConsommationApi(plateforme);

    const { data, error } = await supabase
      .from('x_api_usage')
      .update({ count: consommationActuelle + quantite, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('count')
      .single();

    if (error || !data) {
      console.error(`Erreur lors de l'incrémentation de la consommation pour ${plateforme} :`, error);
      return { consommationActuelle };
    }

    return { consommationActuelle: data.count };
  } catch (err) {
    console.error(err);
    return { consommationActuelle: 0 };
  }
}
