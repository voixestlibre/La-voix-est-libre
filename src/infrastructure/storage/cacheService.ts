// src/infrastructure/storage/cacheService.ts
// Ce service gère le cache offline des fichiers de partitions via la Cache API du navigateur.
// Chaque événement mémorisé a son propre cache nommé "event-files-{eventId}".
// Un seul événement peut être mis en cache à la fois (contrainte applicative, pas technique).
// Les URLs stockées dans le cache sont les URLs publiques Supabase ou externes —
// elles servent de clés de recherche dans le cache.

const CACHE_PREFIX = 'event-files-';

// Extensions mémorisables — ajouter 'mp3', 'wav', 'ogg', 'm4a' pour étendre aux audios
// Seuls les PDF sont mis en cache par défaut.
// Pour inclure les fichiers audio, ajouter 'mp3', 'wav', 'ogg', 'm4a' à ce tableau.
// Attention : les fichiers audio peuvent être volumineux (plusieurs Mo par chant).
const CACHEABLE_EXTENSIONS = ['pdf'];

export function isCacheable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return CACHEABLE_EXTENSIONS.includes(ext);
}

function cacheName(eventId: string): string {
  return `${CACHE_PREFIX}${eventId}`;
}

// Télécharger et mettre en cache tous les fichiers cachables d'un événement
// onProgress(downloaded, total) appelé à chaque fichier téléchargé
export async function cacheEventFiles(
  eventId: string,
  files: { name: string; url: string }[],
  onProgress?: (downloaded: number, total: number) => void
): Promise<{ url: string; ok: boolean }[]> {
  const toCache = files.filter((f) => isCacheable(f.name));
  if (toCache.length === 0) return [];

  const cache = await caches.open(cacheName(eventId));
  let downloaded = 0;
  const results: { url: string; ok: boolean }[] = [];

  for (const file of toCache) {
    let ok = false;
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await cache.put(file.url, response);
      ok = true;
    } catch {}
    results.push({ url: file.url, ok });
    downloaded++;
    onProgress?.(downloaded, toCache.length);
  }
  return results;
}

// Supprimer tout le cache d'un événement
export async function clearEventCache(eventId: string): Promise<void> {
  await caches.delete(cacheName(eventId));
}

// Obtenir l'URL cachée d'un fichier (null si absent du cache)
// La fonction crée un Object URL (blob URL) à partir du contenu mis en cache.
// Ces URLs sont temporaires et valides uniquement pour la session en cours.
// Elles ne doivent pas être persistées dans le localStorage.
export async function getCachedFileUrl(
  eventId: string,
  url: string
): Promise<string | null> {
  const cache = await caches.open(cacheName(eventId));
  const match = await cache.match(url);
  if (!match) return null;
  const blob = await match.blob();
  return URL.createObjectURL(blob);
}
