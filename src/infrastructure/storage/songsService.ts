// src/infrastructure/storage/songsService.ts
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export const EXTERNAL_SONG_BASE_URL = 'https://www.larminat.fr/lavoixestlibre/fichiersWebApp/';

export async function getSong(id: string) {
  return apiGet<any>(`songs.php?action=by_id&id=${id}`);
}

export async function getChoirSongs(choirId: string) {
  return apiGet<any[]>(`songs.php?action=by_choir&choir_id=${choirId}`);
}

export async function getSongsByChoirIds(choirIds: string[]) {
  return apiGet<any[]>(`songs.php?action=by_choir_ids&choir_ids=${encodeURIComponent(choirIds.join(','))}`);
}

export async function getChoirHashtags(choirId: string): Promise<string[]> {
  return apiGet<string[]>(`songs.php?action=hashtags&choir_id=${choirId}`);
}

export async function updateSong(id: string, title: string, hashtags: string[], code: string | null) {
  return apiPut(`songs.php?action=update&id=${id}`, { title, hashtags, code });
}

export async function createSong(choirId: string, title: string, hashtags: string[], code: string | null) {
  return apiPost<any>('songs.php?action=create', { choir_id: choirId, title, hashtags, code });
}

export async function toggleFavoriteSong(id: string, value: boolean) {
  return apiPost(`songs.php?action=toggle_favorite&id=${id}&value=${value}`);
}

export async function toggleCommonSong(id: string, value: boolean) {
  return apiPost(`songs.php?action=toggle_common&id=${id}&value=${value}`);
}

export async function incrementSongViews(id: string) {
  return apiPost(`songs.php?action=increment_views&id=${id}`);
}

export async function deleteSong(id: string) {
  // Supprimer d'abord les fichiers physiques dans fichiersUtilisateurs
  try {
    await apiDelete(`upload.php?action=delete_all&song_id=${id}`);
  } catch {
    // Ignorer si le dossier n'existe pas
  }
  // Puis supprimer le chant en base
  return apiDelete(`songs.php?action=delete&id=${id}`);
}

export async function countChoirSongs(choirId: string): Promise<number> {
  const songs = await getChoirSongs(choirId);
  return songs.length;
}

export async function getSongByTitle(choirId: string, title: string) {
  try {
    return await apiGet<any>(`songs.php?action=by_title&choir_id=${choirId}&title=${encodeURIComponent(title)}`);
  } catch { return null; }
}

export function getSongFileUrl(_songId: string, fileName: string): string {
  const code = fileName.split('.')[0].replace(/-[A-Z0-9]+$/, '');
  return `${EXTERNAL_SONG_BASE_URL}${code}/${fileName}`;
}

export async function getSongFiles(
  songId: string,
  songTitle?: string,
  songCode?: string
): Promise<{ name: string; url: string; source: string }[]> {
  const files: { name: string; url: string; source: string }[] = [];

  // Source 1 : fichiers uploadés par les utilisateurs
  try {
    const uploaded = await apiGet<{ name: string; url: string }[]>(
      `upload.php?action=list&song_id=${songId}`
    );
    for (const f of uploaded) {
      files.push({ name: f.name, url: f.url, source: 'uploaded' });
    }
  } catch {}

  // Source 2 : fichiers proposés sur larminat.fr (si code défini)
  if (songCode && songTitle) {
    const toCheck = [
      { name: `${songTitle}.pdf`, urlSuffix: `${songCode}.pdf` },
      { name: `${songTitle}.mp3`, urlSuffix: `${songCode}.mp3` },
      { name: `${songTitle} - Instruments.mp3`, urlSuffix: `${songCode}-2.mp3` },
      { name: `${songTitle} - Alto.mp3`, urlSuffix: `${songCode}-A.mp3` },
      { name: `${songTitle} - Alto 2.mp3`, urlSuffix: `${songCode}-A2.mp3` },
      { name: `${songTitle} - Basse.mp3`, urlSuffix: `${songCode}-B.mp3` },
      { name: `${songTitle} - Basse 2.mp3`, urlSuffix: `${songCode}-B2.mp3` },
      { name: `${songTitle} - Soprano.mp3`, urlSuffix: `${songCode}-S.mp3` },
      { name: `${songTitle} - Tenor.mp3`, urlSuffix: `${songCode}-T.mp3` },
      { name: `${songTitle} - Tenor 2.mp3`, urlSuffix: `${songCode}-T2.mp3` },
    ];
    for (const f of toCheck) {
      const url = `${EXTERNAL_SONG_BASE_URL}${songCode}/${f.urlSuffix}`;
      // Ne pas ajouter si déjà présent dans les fichiers uploadés
      if (files.some(existing => existing.name === f.name)) continue;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) files.push({ name: f.name, url, source: 'external' });
      } catch {}
    }
  }

  return files;
}

export async function fileExists(songId: string, fileName: string): Promise<boolean> {
  try {
    const files = await apiGet<{ name: string; url: string }[]>(
      `upload.php?action=list&song_id=${songId}`
    );
    return files.some(f => f.name === fileName);
  } catch {
    return false;
  }
}

export async function uploadSongFile(songId: string, fileName: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file, fileName);

  const url = `${import.meta.env.BASE_URL}api/upload.php?action=upload&song_id=${songId}`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erreur upload');
}

export async function deleteSongFile(songId: string, fileName: string): Promise<void> {
  await apiDelete(
    `upload.php?action=delete&song_id=${songId}&file_name=${encodeURIComponent(fileName)}`
  );
}
