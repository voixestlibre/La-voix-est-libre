// infrastructure/songsService.ts
import { supabase } from './supabaseClient';
export const EXTERNAL_SONG_BASE_URL = 'https://www.larminat.fr/petitchoeur/';

// Convertir un tableau de hashtags en chaîne pour stockage
const hashtagsToString = (hashtags: string[]) => hashtags.join(',');

// Convertir une chaîne en tableau de hashtags
const stringToHashtags = (str: string | null) =>
  str ? str.split(',').filter((h) => h.trim().length > 0) : [];

// Créer un chant
export async function createSong(choirId: string, title: string, hashtags: string[], code: string | null) {
  const normalizedCode = code ? code.trim().toUpperCase() : null;
  const { data, error } = await supabase
    .from('songs')
    .insert([{ choir_id: choirId, title, hashtags: hashtagsToString(hashtags), code: normalizedCode }])
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
    .maybeSingle();
  if (error) throw error;
  return { ...data, hashtags: stringToHashtags(data.hashtags) };
}

// Lister les fichiers d'un chant, Supabase + externe
export async function getSongFiles(songId: string, songTitle?: string, code?: string) {
  const files: { name: string; url: string; source: 'supabase' | 'external' }[] = [];

  // 1️⃣ fichiers Supabase
  const { data: supaFiles, error } = await supabase.storage
    .from('songs-files')
    .list(songId);

  if (error) throw error;

  if (supaFiles) {
    for (const f of supaFiles) {
      files.push({
        name: f.name,
        url: getSongFileUrl(songId, f.name), 
        source: 'supabase'
      });
    }
  }

  // 2️⃣ fichiers externes
  if (code && songTitle) {
    const externalFiles = generateExternalFiles(songTitle, code);

    const externalResults = await Promise.all(
      externalFiles.map(async ({ name, urlSuffix }) => {
        const url = `${EXTERNAL_SONG_BASE_URL}${code}/${name}`;

        if (await urlExists(url)) {
          return {
            name: urlSuffix,   // nom lisible
            url,               // URL réelle
            source: 'external' as const
          };
        }
        return null;
      })
    );
    files.push(...externalResults.filter(Boolean) as typeof files);
  }
  return files;
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
export function getSongFileUrl(songId: string, fileName: string, code?: string) {
  // Si aucun code, on reste sur Supabase
  if (!code) {
    const { data } = supabase.storage
      .from('songs-files')
      .getPublicUrl(`${songId}/${fileName}`);
    return data.publicUrl;
  }

  // Gestion des fichiers externes : convertir fileName affiché en nom réel
  let realName = "";

  // Exemple PDF
  const pageMatch = fileName.match(/- Page (\d+)/);
  if (fileName.endsWith(".pdf")) {
    if (!pageMatch) {
      realName = `${code}.pdf`;
    } else {
      realName = `${code}-${pageMatch[1]}.pdf`;
    }
  }

  // Exemple MP3
  else if (fileName.endsWith(".mp3")) {
    const mp3Map: Record<string, string> = {
      "Alto": "A",
      "Alto 2": "A2",
      "Basse": "B",
      "Basse 2": "B2",
      "Soprano": "S",
      "Tenor": "T",
      "Tenor 2": "T2"
    };
    const roleMatch = fileName.match(/- (\w+(?: \d)?)\.mp3$/);
    if (roleMatch) {
      const suffix = mp3Map[roleMatch[1]];
      if (suffix) {
        realName = `${code}-${suffix}.mp3`;
      }
    } else {
      // MP3 complet sans suffixe de voix : "Mon chant.mp3" → "yyyyyy.mp3"
      realName = `${code}.mp3`;
    }
  }  

  if (!realName) {
    // fallback pour sécurité
    return "";
  }

  return `${EXTERNAL_SONG_BASE_URL}${code}/${realName}`;
}


// Supprimer un chant et tous ses fichiers associés
export async function deleteSong(songId: string) {
  // Lister tous les fichiers du chant dans le bucket
  const files = await getSongFiles(songId);

  // Supprimer tous les fichiers du bucket si il y en a
  if (files.length > 0) {
    const filePaths = files
      .filter((f) => f.source === 'supabase')  // ← ignorer les fichiers externes
      .map((f) => `${songId}/${f.name}`);
    const { error: storageError } = await supabase.storage
      .from('songs-files')
      .remove(filePaths);
    if (storageError) throw storageError;
  }

  // Supprimer les référence à ce chant dans les évènements
  await supabase.from('event_songs').delete().eq('song_id', songId);

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
export async function updateSong(songId: string, title: string, hashtags: string[], code: string | null) {
  const normalizedCode = code ? code.trim().toUpperCase() : null;
  const { error } = await supabase
    .from('songs')
    .update({ title, hashtags: hashtagsToString(hashtags), code: normalizedCode })
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


// Vérifier si un chant avec ce titre existe déjà dans la chorale
export async function songTitleExists(choirId: string, title: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('songs')
    .select('id')
    .eq('choir_id', choirId)
    .eq('title', title)
    .single();
  if (error) return false;
  return !!data;
}


// Basculer le statut favori d'un chant
export async function toggleFavoriteSong(songId: string, isFavorite: boolean) {
  const { error } = await supabase
    .from('songs')
    .update({ is_favorite: isFavorite })
    .eq('id', songId);
  if (error) throw error;
}


// Récupérer tous les chants accessibles pour une liste de choir_ids
export async function getSongsByChoirIds(choirIds: string[]) {
  if (choirIds.length === 0) return [];
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, hashtags, choir_id, code')
    .in('choir_id', choirIds)
    .order('title');
  if (error) throw error;
  return (data || []).map((s) => ({ ...s, hashtags: stringToHashtags(s.hashtags) }));
}


// Basculer le statut common d'un chant
export async function toggleCommonSong(songId: string, isCommon: boolean) {
  const { error } = await supabase
    .from('songs')
    .update({ is_common: isCommon })
    .eq('id', songId);
  if (error) throw error;
}


// Fichiers PDF et audio externes avec suffixes lisibles
function generateExternalFiles(songTitle: string, code: string) {
  const files: { name: string, urlSuffix: string }[] = [];

  // PDFs
  files.push({ name: `${code}.pdf`, urlSuffix: `${songTitle}.pdf` });
  //for (let i = 1; i <= 20; i++) {
    //files.push({ name: `${code}-${i}.pdf`, urlSuffix: `${songTitle} - Page ${i}.pdf` });
  //}

  // MP3 complet (sans suffixe de voix)
  files.push({ name: `${code}.mp3`, urlSuffix: `${songTitle}.mp3` });
  
  // Autres MP3s
  const audioMap: Record<string, string> = {
    'A': 'Alto',
    'A2': 'Alto 2',
    'B': 'Basse',
    'B2': 'Basse 2',
    'S': 'Soprano',
    'T': 'Tenor',
    'T2': 'Tenor 2',
  };
  for (const [suffix, readable] of Object.entries(audioMap)) {
    files.push({ name: `${code}-${suffix}.mp3`, urlSuffix: `${songTitle} - ${readable}.mp3` });
  }

  return files;
}

// Vérifier si une URL existe
async function urlExists(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}


export async function getSongByTitle(choirId: string, title: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, code, hashtags')
    .eq('choir_id', choirId)
    .eq('title', title)
    .maybeSingle();
  if (error) throw error;
  return data; // null si pas trouvé
}