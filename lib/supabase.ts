import { createClient } from '@supabase/supabase-js';

// Utilisation d'un accès par clé dynamique process.env[...] 
// pour empêcher le compilateur Next.js (Webpack/Turbopack) de figer 
// la valeur de NEXT_PUBLIC_SUPABASE_URL au moment du build (statique).
const getRuntimeEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
};

const supabaseUrl = getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY') || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});
