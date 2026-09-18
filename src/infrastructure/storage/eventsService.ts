// src/infrastructure/storage/eventsService.ts
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export async function getEvent(id: string) {
  return apiGet<any>(`events.php?action=by_id&id=${id}`);
}

export async function getEventByCode(code: string) {
  return apiGet<any>(`events.php?action=by_code&code=${encodeURIComponent(code)}`);
}

export async function getChoirEvents(choirId: string) {
  return apiGet<any[]>(`events.php?action=by_choir&choir_id=${choirId}`);
}

export async function getEventsByChoirIds(choirIds: string[]) {
  return apiGet<any[]>(`events.php?action=by_choir_ids&choir_ids=${encodeURIComponent(choirIds.join(','))}`);
}

export async function getEventsByCodes(codes: string[]) {
  return apiGet<any[]>(`events.php?action=by_codes&codes=${encodeURIComponent(codes.join(','))}`);
}

export async function getEventSongsTitles(eventId: string) {
  return apiGet<any[]>(`events.php?action=song_titles&event_id=${eventId}`);
}

export async function getEventSongsDetails(eventId: string) {
  return apiGet<any[]>(`events.php?action=song_details&event_id=${eventId}`);
}

export async function getEventSongs(eventId: string): Promise<string[]> {
  const songs = await apiGet<any[]>(`events.php?action=song_titles&event_id=${eventId}`);
  return songs.map((s: any) => String(s.id));
}

export async function setEventSongs(eventId: string, songIds: string[]): Promise<void> {
  await apiPut(`events.php?action=update&id=${eventId}`, { song_ids: songIds });
}

export async function incrementEventViews(id: string) {
  return apiPost(`events.php?action=increment_views&id=${id}`);
}

export async function toggleEventActive(id: string, value: boolean) {
  return apiPost(`events.php?action=toggle_active&id=${id}&value=${value}`);
}

export async function createEvent(
  choirId: string,
  name: string,
  eventDate: string | null,
  _createdBy?: number | null
) {
  return apiPost<any>('events.php?action=create', { name, choir_id: choirId, event_date: eventDate });
}

export async function updateEvent(
  id: string,
  name: string,
  eventDate: string | null,
  songIds?: string[]
) {
  return apiPut(`events.php?action=update&id=${id}`, {
    name,
    event_date: eventDate,
    ...(songIds !== undefined ? { song_ids: songIds } : {}),
  });
}

export async function deleteEvent(id: string) {
  return apiDelete(`events.php?action=delete&id=${id}`);
}
