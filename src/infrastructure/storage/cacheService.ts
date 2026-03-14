// src/infrastructure/storage/cacheService.ts

const CACHE_PREFIX = 'event-files-';

// Extensions mémorisables — ajouter 'mp3', 'wav', 'ogg', 'm4a' pour étendre aux audios
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
): Promise<void> {
  const toCache = files.filter((f) => isCacheable(f.name));
  if (toCache.length === 0) return;

  const cache = await caches.open(cacheName(eventId));
  let downloaded = 0;

  for (const file of toCache) {
    const response = await fetch(file.url);
    await cache.put(file.url, response);
    downloaded++;
    onProgress?.(downloaded, toCache.length);
  }
}

// Supprimer tout le cache d'un événement
export async function clearEventCache(eventId: string): Promise<void> {
  await caches.delete(cacheName(eventId));
}

// Obtenir l'URL cachée d'un fichier (null si absent du cache)
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
