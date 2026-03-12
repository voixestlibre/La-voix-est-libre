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

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://lavoixestlibre.netlify.app/reset-password',
  });
  if (error) throw error;
}


export async function setSessionFromHash(accessToken: string, refreshToken: string) {
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
}

export async function resetPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}


export async function createDelegateAccount(email: string, password: string, choirId: string) {
  const { data: existing } = await supabase
    .from('users_param')
    .select('email, choirs_delegations')
    .eq('email', email)
    .single();

  if (existing) {
    const current = existing.choirs_delegations
      ? existing.choirs_delegations.split(';').map((s: string) => s.trim())
      : [];
    if (!current.includes(String(choirId))) {
      const updated = [...current, String(choirId)].join(';');
      await supabase.from('users_param').update({ choirs_delegations: updated }).eq('email', email);
    }
    return { isNewUser: false };
  } else {
    // Sauvegarder la session courante (email1)
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    // Créer le compte email2
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Insérer dans users_param
    await supabase.from('users_param').insert([{
      email,
      is_admin: false,
      choirs_nb: 0,
      choirs_delegations: String(choirId),
    }]);

    // Restaurer la session email1
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });
    }

    return { isNewUser: true };
  }
}


export async function getUserDelegations(email: string): Promise<string[]> {
  const { data } = await supabase
    .from('users_param')
    .select('choirs_delegations')
    .eq('email', email)
    .single();
  if (!data?.choirs_delegations) return [];
  return data.choirs_delegations.split(';').map((s: string) => s.trim());
}


export async function getUserParamId(email: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('users_param')
    .select('id')
    .eq('email', email)
    .single();
  if (error) return null;
  return data.id;
}


export async function getChoirDelegates(choirId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('users_param')
    .select('email, choirs_delegations')
    .not('choirs_delegations', 'is', null);
  if (error) throw error;
  return (data || [])
    .filter((row) => row.choirs_delegations?.split(';').includes(choirId))
    .map((row) => row.email);
}