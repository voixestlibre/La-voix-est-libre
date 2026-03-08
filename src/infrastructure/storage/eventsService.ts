import { supabase } from './supabaseClient';
import { generateUniqueCode } from './choirsService';

// Récupérer un événement par son id
export async function getEvent(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  if (error) throw error;
  return data;
}

// Créer un événement
export async function createEvent(choirId: string, name: string, eventDate: string) {
  const code = await generateUniqueCode();
  const { data, error } = await supabase
    .from('events')
    .insert([{ choir_id: choirId, name, event_date: eventDate, code }])
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
    .eq('id', eventId);
  if (error) throw error;
}

// Récupérer les chants associés à un événement
export async function getEventSongs(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_songs')
    .select('song_id')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data || []).map((r) => r.song_id);
}

// Remplacer les chants associés à un événement
export async function setEventSongs(eventId: string, songIds: string[]) {
  // Supprimer les associations existantes
  const { error: deleteError } = await supabase
    .from('event_songs')
    .delete()
    .eq('event_id', eventId);
  if (deleteError) throw deleteError;

  // Insérer les nouvelles associations avec leur position
  if (songIds.length > 0) {
    const { error: insertError } = await supabase
      .from('event_songs')
      .insert(songIds.map((song_id, index) => ({ event_id: eventId, song_id, position: index })));
    if (insertError) throw insertError;
  }
}


// Récupérer les événements d'une chorale triés par date
export async function getChoirEvents(choirId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('choir_id', choirId)
    .order('event_date');
  if (error) throw error;
  return data || [];
}


// Récupérer les chants associés à un événement avec leurs détails
export async function getEventSongsDetails(eventId: string) {
  const { data: links, error: linksError } = await supabase
    .from('event_songs')
    .select('song_id, position')
    .eq('event_id', eventId)
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
    .eq('event_id', eventId);
  if (linksError) throw linksError;

  // Supprimer l'événement
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}

// Récupérer les ids des événements d'une chorale
export async function getChoirEventIds(choirId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('choir_id', choirId);
  if (error) throw error;
  return (data || []).map((e) => String(e.id));
}