import { supabase } from './supabase';

const MAX_GLOBAL_CALLS = 150;

/**
 * Retrieves the current global API usage count.
 */
export async function getGlobalApiUsage(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('x_api_usage')
      .select('count')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la récupération de la consommation globale d'API :", error);
      return 0;
    }

    if (!data) {
      // Si la ligne n'existe pas, on tente de l'insérer
      const { data: newData } = await supabase
        .from('x_api_usage')
        .insert({ id: 1, count: 0 })
        .select('count')
        .single();
      return newData?.count || 0;
    }

    return data.count;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

/**
 * Checks if a requested number of API calls is allowed within the remaining budget,
 * and if so, increments the counter in Supabase.
 */
export async function checkAndIncrementApiUsage(amount: number = 1): Promise<{ allowed: boolean; currentCount: number }> {
  try {
    // 1. Récupérer le compteur actuel
    const currentCount = await getGlobalApiUsage();

    // 2. Vérifier si l'incrément dépasse la limite
    if (currentCount + amount > MAX_GLOBAL_CALLS) {
      return { allowed: false, currentCount };
    }

    // 3. Mettre à jour le compteur en base
    const { data, error } = await supabase
      .from('x_api_usage')
      .update({ count: currentCount + amount, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('count')
      .single();

    if (error || !data) {
      console.error("Erreur lors de l'incrémentation de la consommation globale :", error);
      return { allowed: false, currentCount };
    }

    return { allowed: true, currentCount: data.count };
  } catch (err) {
    console.error(err);
    return { allowed: false, currentCount: 0 };
  }
}
