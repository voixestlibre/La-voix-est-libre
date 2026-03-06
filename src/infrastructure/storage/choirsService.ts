// infrastructure/choirsService.ts
import { supabase } from './supabaseClient';

/**
 * Génère un code unique pour la chorale
 */
async function generateUniqueCode(): Promise<number> {
  let code: number = 0;
  let exists = true;

  while (exists) {
    code = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

    const { data, error } = await supabase
      .from('choirs')
      .select('code')
      .eq('code', code)
      .limit(1);

    if (error) throw error;

    exists = data && data.length > 0;
  }
  return code;
}

/**
 * Crée une chorale avec name et id utilisateur, génère automatiquement code
 */
export async function createChoir(name: string, owner_id: string) {
  const code = await generateUniqueCode();
  const { data, error } = await supabase
    .from('choirs')
    .insert([{ name, owner_id, code }]);

  if (error) throw error;

  return data;
}