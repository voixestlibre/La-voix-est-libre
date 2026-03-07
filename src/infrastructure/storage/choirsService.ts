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
    .insert([{ name, owner_id, code }])
    .select()
    .single();
    
  if (error) throw error;

  return data;
}


// Récupérer le propriétaire d'une chorale
export async function getChoirOwner(choirId: string) {
  const { data, error } = await supabase
    .from('choirs')
    .select('owner_id')
    .eq('id', choirId)
    .single();
  if (error) throw error;
  return data?.owner_id;
}

// Récupérer les chorales dont l'utilisateur est propriétaire
export async function getOwnedChoirs(userId: string) {
  const { data, error } = await supabase
    .from('choirs')
    .select('*')
    .eq('owner_id', userId);
  if (error) throw error;
  return data || [];
}

// Récupérer une chorale par son code
export async function getChoirByCode(code: string) {
  const { data, error } = await supabase
    .from('choirs')
    .select('id, code, name')
    .eq('code', code)
    .single();
  if (error) throw error;
  return data;
}

// Récupérer les chorales par leurs codes
export async function getChoirsByCodes(codes: string[]) {
  const { data, error } = await supabase
    .from('choirs')
    .select('*')
    .in('code', codes);
  if (error) throw error;
  return data || [];
}

// Récupérer une chorale
export async function getChoir(id: string) {
  const { data, error } = await supabase
    .from('choirs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}


// Supprimer une chorale
export async function deleteChoir(id: string) {
  const { error } = await supabase.from('choirs').delete().eq('id', id);
  if (error) throw error;
}

// Compter le nombre de chorales dont l'utilisateur est propriétaire
export async function countOwnedChoirs(userId: string) {
  const { count, error } = await supabase
    .from('choirs')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);
  if (error) throw error;
  return count ?? 0;
}