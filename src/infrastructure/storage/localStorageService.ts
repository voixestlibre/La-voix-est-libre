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
    songs: { id: string; title: string }[];
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