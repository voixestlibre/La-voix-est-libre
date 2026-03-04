// infrastructure/authService.ts
import { supabase } from './supabaseClient';

export const MAGIC_SECRET = '123456789';

export async function login(email: string, password: string) {
  if (password === MAGIC_SECRET) {
    // Vérifier si déjà admin
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('administrators')
      .select('email')
      .eq('email', email)
      .limit(1);
    if (fetchError) throw fetchError;

    // Créer le compte Supabase
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Si ce n'est pas “déjà enregistré”, lever l'erreur
      if (!error.message.includes('already registered')) {
        throw error;
      }
    }

    // Ajouter dans administrators si pas déjà présent
    if (!existingAdmin || existingAdmin.length === 0) {
      const { error: adminError } = await supabase
        .from('administrators')
        .insert([{ email }]);
      if (adminError) throw adminError;

      return { email, isAdmin: true, message: 'Email enregistré comme administrateur !' };
    } else {
      return { email, isAdmin: true, message: 'Email déjà enregistré comme administrateur...' };
    }
  }

  // Login classique
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return { email: data.user?.email, isAdmin: false, message: 'Connexion réussie !' };
}


export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data; 
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}