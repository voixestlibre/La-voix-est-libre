// infrastructure/choirsService.ts
import { supabase } from './supabaseClient';

// Convertir un tableau de hashtags en chaîne pour stockage
const hashtagsToString = (hashtags: string[]) => hashtags.join(',');

// Convertir une chaîne en tableau de hashtags
const stringToHashtags = (str: string | null) =>
  str ? str.split(',').filter((h) => h.trim().length > 0) : [];

// Créer un chant
export async function createSong(choirId: string, title: string, hashtags: string[]) {
  const { data, error } = await supabase
    .from('songs')
    .insert([{ choir_id: choirId, title, hashtags: hashtagsToString(hashtags) }])
    .select()
    .single();
  if (error) throw error;
  return { ...data, hashtags: stringToHashtags(data.hashtags) };
}


// Récupérer un chant par son id
export async function getSong(songId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', songId)
    .single();
  if (error) throw error;
  return { ...data, hashtags: stringToHashtags(data.hashtags) };
}

// Lister les fichiers d'un chant
export async function getSongFiles(songId: string) {
  const { data, error } = await supabase.storage
    .from('songs-files')
    .list(songId);
  if (error) throw error;
  return data || [];
}

// Vérifier si un fichier existe déjà
export async function fileExists(songId: string, fileName: string) {
  const files = await getSongFiles(songId);
  return files.some((f) => f.name === fileName);
}

// Uploader un fichier
export async function uploadSongFile(songId: string, fileName: string, file: File) {
  const filePath = `${songId}/${fileName}`;
  const { error } = await supabase.storage
    .from('songs-files')
    .upload(filePath, file);
  if (error) throw error;
}

// Supprimer un fichier
export async function deleteSongFile(songId: string, fileName: string) {
  const { error } = await supabase.storage
    .from('songs-files')
    .remove([`${songId}/${fileName}`]);
  if (error) throw error;
}

// Obtenir l'URL publique d'un fichier
export function getSongFileUrl(songId: string, fileName: string) {
  const { data } = supabase.storage
    .from('songs-files')
    .getPublicUrl(`${songId}/${fileName}`);
  return data.publicUrl;
}


// Supprimer un chant et tous ses fichiers associés
export async function deleteSong(songId: string) {
  // Lister tous les fichiers du chant dans le bucket
  const files = await getSongFiles(songId);

  // Supprimer tous les fichiers du bucket si il y en a
  if (files.length > 0) {
    const filePaths = files.map((f) => `${songId}/${f.name}`);
    const { error: storageError } = await supabase.storage
      .from('songs-files')
      .remove(filePaths);
    if (storageError) throw storageError;
  }

  // Supprimer le chant en base
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', songId);
  if (error) throw error;
}

// Récupérer tous les hashtags utilisés dans les chants d'une chorale
export async function getChoirHashtags(choirId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('hashtags')
    .eq('choir_id', choirId);
  if (error) throw error;
  const all = data.flatMap((s) => stringToHashtags(s.hashtags));
  return [...new Set(all)].sort();
}

// Mettre à jour un chant
export async function updateSong(songId: string, title: string, hashtags: string[]) {
  const { error } = await supabase
    .from('songs')
    .update({ title, hashtags: hashtagsToString(hashtags) })
    .eq('id', songId);
  if (error) throw error;
}

// Récupérer les chants d'une chorale
export async function getChoirSongs(choirId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('choir_id', choirId)
    .order('title');
  if (error) throw error;
  return (data || []).map((s) => ({ ...s, hashtags: stringToHashtags(s.hashtags) }));
}


// Récupérer les ids de tous les chants d'une chorale
export async function getChoirSongIds(choirId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('id')
    .eq('choir_id', choirId);
  if (error) throw error;
  return (data || []).map((s) => s.id);
}

// Compter les chants d'une chorale
export async function countChoirSongs(choirId: string) {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('choir_id', choirId);
  if (error) throw error;
  return count ?? 0;
}