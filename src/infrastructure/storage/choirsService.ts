// infrastructure/choirsService.ts
import { supabase } from './supabaseClient';

// Générer un code à 8 chiffres unique dans les tables choirs ET events
// Le code est vérifié à la fois dans les tables 'choirs' ET 'events' pour garantir
// l'unicité globale — un même code peut servir à rejoindre une chorale OU un événement
// depuis la page ChoirJoinPage, donc les deux espaces de nommage sont partagés.
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

// Supprimer une chorale et toutes ses données associées :
// événements, liens event_songs, chants, et fichiers dans le bucket
// La suppression est faite en plusieurs étapes dans un ordre précis pour respecter
// les contraintes de clés étrangères :
// 1. event_songs (références vers events et songs)
// 2. events (références vers choirs)
// 3. fichiers bucket (indépendants de la BDD)
// 4. songs (références vers choirs)
// 5. choir
// 6. nettoyage des délégations dans users_param
// Note : cette fonction n'est pas transactionnelle — en cas d'erreur partielle,
// des données orphelines peuvent subsister.
export async function deleteChoirCascade(choirId: string) {

  // Étape 1 : récupérer tous les événements de la chorale
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('choir_id', parseInt(choirId, 10));

  if (events && events.length > 0) {
    const eventIds = events.map((e: any) => e.id);

    // Étape 2 : supprimer les liens event_songs de ces événements
    await supabase
      .from('event_songs')
      .delete()
      .in('event_id', eventIds);

    // Étape 3 : supprimer les événements
    await supabase
      .from('events')
      .delete()
      .in('id', eventIds);
  }

  // Étape 4 : récupérer tous les chants de la chorale
  const { data: songs } = await supabase
    .from('songs')
    .select('id')
    .eq('choir_id', choirId);

  if (songs && songs.length > 0) {
    const songIds = songs.map((s: any) => s.id);

    // Étape 5 : supprimer les fichiers du bucket pour chaque chant
    for (const songId of songIds) {
      const { data: files } = await supabase.storage
        .from('songs-files')
        .list(songId);
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${songId}/${f.name}`);
        await supabase.storage.from('songs-files').remove(paths);
      }
    }

    // Étape 6 : supprimer les chants
    await supabase
      .from('songs')
      .delete()
      .in('id', songIds);
  }

  // Étape 7 : supprimer la chorale elle-même
  const { error } = await supabase.from('choirs').delete().eq('id', choirId);
  if (error) throw error;

  // Étape 8 : nettoyer choirs_delegations dans users_param
  // La colonne contient un CSV de choir_ids séparés par ';'
  // Il faut retirer choirId de la liste pour tous les utilisateurs concernés
  const { data: delegatedUsers } = await supabase
    .from('users_param')
    .select('id, choirs_delegations')
    .not('choirs_delegations', 'is', null);

  if (delegatedUsers && delegatedUsers.length > 0) {
    for (const user of delegatedUsers) {
      const ids = (user.choirs_delegations as string)
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s !== '' && s !== String(choirId));
      
      const newValue = ids.length > 0 ? ids.join(';') : null;
      
      // Mettre à jour uniquement si la valeur change
      if (ids.join(';') !== (user.choirs_delegations as string)) {
        await supabase
          .from('users_param')
          .update({ choirs_delegations: newValue })
          .eq('id', user.id);
      }
    }
  }  
}

export async function updateChoir(choirId: string, name: string) {
  const { error } = await supabase
    .from('choirs')
    .update({ name })
    .eq('id', choirId);
  if (error) throw error;
}