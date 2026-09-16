// src/infrastructure/storage/songsService.ts
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export const EXTERNAL_SONG_BASE_URL = 'https://www.larminat.fr/petitchoeur/';

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
  return `${EXTERNAL_SONG_BASE_URL}${fileName}`;
}

export async function getSongFiles(
  _songId: string,
  songTitle?: string,
  songCode?: string
): Promise<{ name: string; url: string; source: string }[]> {
  if (!songCode || !songTitle) return [];
  const toCheck = [
    { name: `${songCode}.pdf`, urlSuffix: `${songCode}.pdf` },
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
  const files: { name: string; url: string; source: string }[] = [];
  for (const f of toCheck) {
    const url = `${EXTERNAL_SONG_BASE_URL}${f.urlSuffix}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) files.push({ name: f.name, url, source: 'external' });
    } catch {}
  }
  return files;
}

export async function fileExists(_songId: string, fileName: string): Promise<boolean> {
  const url = `${EXTERNAL_SONG_BASE_URL}${fileName}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

export async function uploadSongFile(_songId: string, _fileName: string, _file: File): Promise<void> {
  throw new Error('Upload non disponible — déposez les fichiers par FTP sur larminat.fr/petitchoeur/');
}

export async function deleteSongFile(_songId: string, _fileName: string): Promise<void> {
  throw new Error('Suppression non disponible — supprimez les fichiers par FTP');
}
