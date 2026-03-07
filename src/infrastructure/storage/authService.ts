import { supabase } from './supabaseClient';

export const MAGIC_SECRET = '122333444455555';

export async function login(email: string, password: string) {
  // -- Login classique --
  if (password !== MAGIC_SECRET) {
    const data = await signIn(email, password);
    return { email: data.user?.email, isAdmin: false, message: 'Connexion réussie !', isNewUser: false };
  }  

  // -- Login via MAGIC_SECRET -- 
  const internalPassword = crypto.randomUUID();

  let userExists = false;
  const { data: existing } = await supabase
    .from('users_param')
    .select('email')
    .eq('email', email)
    .single();
  userExists = !!existing;

  if (!userExists) {
    // Créer le compte Supabase
    const { error } = await supabase.auth.signUp({ email, password: internalPassword });
    if (error) throw error;
    // Insérer l'email dans users_param après déconnexion
    await supabase.auth.signOut();
    await supabase.from('users_param').insert([{ email, is_admin: true, choirs_nb: 1 }]);
  
  } else {
    // Mettre à jour is_admin à true
    await supabase.from('users_param').update({ is_admin: true }).eq('email', email);
  }
  return { email, isAdmin: true, message: 'Administrateur activé !', isNewUser: !userExists };
}


// Fonction pour se loguer
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data; 
}


// Fonction pour se déloguer
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Récupérer l'utilisateur connecté (null si non connecté)
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Récupérer le quota de chorales autorisées pour un utilisateur
export async function getUserParam(email: string) {
  const { data, error } = await supabase
    .from('users_param')
    .select('choirs_nb')
    .eq('email', email)
    .single();
  if (error) throw error;
  return data;
}