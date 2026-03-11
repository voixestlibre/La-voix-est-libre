import { supabase } from './supabaseClient';
import { generateUniqueCode } from './choirsService';

// Récupérer un événement par son id
export async function getEvent(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', parseInt(eventId, 10))
    .single();
  if (error) throw error;
  return data;
}

// Créer un événement
export async function createEvent(choirId: string, name: string, eventDate: string) {
  const code = await generateUniqueCode();
  const { data, error } = await supabase
    .from('events')
    .insert([{ choir_id: parseInt(choirId, 10), name, event_date: eventDate, code }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Modifier un événement
export async function updateEvent(eventId: string, name: string, eventDate: string) {
  const { error } = await supabase
    .from('events')
    .update({ name, event_date: eventDate })
    .eq('id', parseInt(eventId, 10))
  if (error) throw error;
}

// Récupérer les chants associés à un événement
export async function getEventSongs(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_songs')
    .select('song_id')
    .eq('event_id', parseInt(eventId, 10));
  if (error) throw error;
  return (data || []).map((r) => r.song_id);
}

// Remplacer les chants associés à un événement
export async function setEventSongs(eventId: string, songIds: string[]) {
  // Supprimer les associations existantes
  const { error: deleteError } = await supabase
    .from('event_songs')
    .delete()
    .eq('event_id', parseInt(eventId, 10));
  if (deleteError) throw deleteError;

  // Insérer les nouvelles associations avec leur position
  if (songIds.length > 0) {
    const { error: insertError } = await supabase
      .from('event_songs')
      .insert(songIds.map((song_id, index) => ({ event_id: parseInt(eventId, 10), song_id, position: index })));
    if (insertError) throw insertError;
  }
}


// Récupérer les événements d'une chorale triés par date
export async function getChoirEvents(choirId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('choir_id', parseInt(choirId, 10))
    .order('event_date', { ascending: false });
  if (error) throw error;
  return data || [];
}


// Récupérer les chants associés à un événement avec leurs détails
export async function getEventSongsDetails(eventId: string) {
  const { data: links, error: linksError } = await supabase
    .from('event_songs')
    .select('song_id, position')
    .eq('event_id', parseInt(eventId, 10))
    .order('position');
  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const songIds = links.map((r) => r.song_id);

  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id, title, hashtags')
    .in('id', songIds);
  if (songsError) throw songsError;

  // Retrier selon l'ordre de position
  return links.map((link) => {
    const song = songs?.find((s) => s.id === link.song_id);
    return {
      ...song,
      hashtags: song?.hashtags ? song.hashtags.split(',').filter(Boolean) : [],
    };
  });
}

// Supprimer un événement et ses liens avec les chants
export async function deleteEvent(eventId: string) {
  // Supprimer les liens dans la table de jointure
  const { error: linksError } = await supabase
    .from('event_songs')
    .delete()
    .eq('event_id', parseInt(eventId, 10));
  if (linksError) throw linksError;

  // Supprimer l'événement
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', parseInt(eventId, 10));
  if (error) throw error;
}

// Récupérer les ids des événements d'une chorale
export async function getChoirEventIds(choirId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('choir_id', parseInt(choirId, 10));
  if (error) throw error;
  return (data || []).map((e) => String(e.id));
}

// Récupérer un événement par son code
export async function getEventByCode(code: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Not found');

  // Récupérer la chorale de rattachement
  const { data: choirData } = await supabase
    .from('choirs')
    .select('id, code, name')
    .eq('id', parseInt(data.choir_id, 10))
    .maybeSingle();

  return { ...data, choir: choirData || null };
}

// Récupérer tous les évènements pour une liste de chorales
export async function getEventsByChoirIds(choirIds: string[]) {
  if (choirIds.length === 0) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('choir_id', choirIds.map((id) => parseInt(id, 10)));
  if (error) throw error;
  return data || [];
}


export async function getEventsByCodes(codes: string[]) {
  if (codes.length === 0) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('code', codes);
  if (error) throw error;
  return data || [];
}


export async function getEventSongsTitles(eventId: string): Promise<{ id: string; title: string }[]> {
  // Étape 1 : récupérer les song_ids de l'événement, ordonnés par position
  const { data: eventSongs, error: e1 } = await supabase
    .from('event_songs')
    .select('song_id')
    .eq('event_id', parseInt(eventId, 10))
    .order('position');
  if (e1) throw e1;
  if (!eventSongs || eventSongs.length === 0) return [];

  const songIds = eventSongs.map((row: any) => row.song_id);

  // Étape 2 : récupérer les titres des chants correspondants
  const { data: songs, error: e2 } = await supabase
    .from('songs')
    .select('id, title')
    .in('id', songIds);
  if (e2) throw e2;

  // Réordonner selon l'ordre de l'événement (l'étape 2 ne garantit pas l'ordre)
  return songIds
    .map((id: string) => songs.find((s: any) => s.id === id))
    .filter(Boolean);
}