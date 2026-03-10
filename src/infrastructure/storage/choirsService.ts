// infrastructure/choirsService.ts
import { supabase } from './supabaseClient';

// Générer un code à 8 chiffres unique dans les tables choirs ET events
export async function generateUniqueCode(): Promise<string> {
  let code: string;
  let exists = true;
  do {
    code = Math.floor(10000000 + Math.random() * 90000000).toString();
    const [{ data: choir }, { data: event }] = await Promise.all([
      supabase.from('choirs').select('id').eq('code', code).maybeSingle(),
      supabase.from('events').select('id').eq('code', code).maybeSingle(),
    ]);
    exists = !!choir || !!event;
  } while (exists);
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
    .maybeSingle();
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