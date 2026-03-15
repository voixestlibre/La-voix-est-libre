// infrastructure/storage/localStorageService.ts

// ── Types ──────────────────────────────────────────────────────────────

export interface StoredChoir {
  id: string;
  code: string;
  name: string;
}

export interface StoredEvent {
  id: string;
  code: string;
  name: string;
  choir_id: string;
  choir_name: string | null;
  event_date?: string | null;
  songs: { id: string; title: string }[];
  is_cached?: boolean; // true si les fichiers de cet événement sont mémorisés localement
  cached_files?: { songId: string; fileName: string }[];
  active?: boolean;
}

// ── Chorales ───────────────────────────────────────────────────────────

// Lire toutes les chorales du localStorage
export function getStoredChoirs(): StoredChoir[] {
  return JSON.parse(localStorage.getItem('joined_choirs') || '[]').filter(Boolean);
}

// Sauvegarder la liste complète des chorales
export function setStoredChoirs(choirs: StoredChoir[]): void {
  localStorage.setItem('joined_choirs', JSON.stringify(choirs));
}

// Supprimer une chorale par son id
export function removeStoredChoir(choirId: string): void {
  setStoredChoirs(getStoredChoirs().filter((c) => String(c.id) !== String(choirId)));
}

// ── Événements ─────────────────────────────────────────────────────────

// Lire tous les événements du localStorage
export function getStoredEvents(): StoredEvent[] {
  return JSON.parse(localStorage.getItem('joined_events') || '[]').filter(Boolean);
}

// Sauvegarder la liste complète des événements
export function setStoredEvents(events: StoredEvent[]): void {
  localStorage.setItem('joined_events', JSON.stringify(events));
}

// Supprimer tous les événements d'une chorale par l'id de la chorale
// Utilisé quand on quitte ou supprime une chorale
export function removeStoredEventsByChoirId(choirId: string): void {
  setStoredEvents(getStoredEvents().filter((e) => String(e.choir_id) !== String(choirId)));
}

// Supprimer un événement par son id
// Utilisé quand on quitte un événement directement
export function removeStoredEvent(eventId: string): void {
  setStoredEvents(getStoredEvents().filter((e) => String(e.id) !== String(eventId)));
}

// Retourner l'événement marqué is_cached (au plus 1)
export function getCachedEvent(): StoredEvent | null {
  return getStoredEvents().find((e) => e.is_cached === true) ?? null;
}

// Marquer un événement comme mémorisé et démarquer tous les autres
export function setCachedEventId(eventId: string): void {
  setStoredEvents(
    getStoredEvents().map((e) => ({
      ...e,
      is_cached: String(e.id) === String(eventId),
    }))
  );
}

// Démarquer l'événement mémorisé (sans supprimer le cache API — à faire séparément)
export function clearCachedEventId(): void {
  setStoredEvents(
    getStoredEvents().map((e) => ({ ...e, is_cached: false }))
  );
}