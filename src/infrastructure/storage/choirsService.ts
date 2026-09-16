// src/infrastructure/storage/choirsService.ts
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export async function getChoir(id: string) {
  return apiGet<any>(`choirs.php?action=by_id&id=${id}`);
}

export async function getChoirByCode(code: string) {
  return apiGet<any>(`choirs.php?action=by_code&code=${encodeURIComponent(code)}`);
}

export async function getOwnedChoirs(ownerId: string | number) {
  return apiGet<any[]>(`choirs.php?action=owned&owner_id=${ownerId}`);
}

export async function getChoirsByCodes(codes: string[]) {
  return apiGet<any[]>(`choirs.php?action=by_codes&codes=${encodeURIComponent(codes.join(','))}`);
}

export async function getChoirOwner(choirId: string): Promise<number> {
  const res = await apiGet<{ owner_id: number }>(`choirs.php?action=owner&choir_id=${choirId}`);
  return res.owner_id;
}

export async function createChoir(name: string, _ownerId?: string | number) {
  return apiPost<any>('choirs.php?action=create', { name });
}

export async function updateChoir(choirId: string, name: string) {
  return apiPut<any>(`choirs.php?action=update&id=${choirId}`, { name });
}

export async function deleteChoir(id: string) {
  return apiDelete(`choirs.php?action=delete&id=${id}`);
}

export async function deleteChoirCascade(choirId: string) {
  return apiDelete(`choirs.php?action=delete_cascade&id=${choirId}`);
}

export async function countOwnedChoirs(userId: string | number): Promise<number> {
  const choirs = await getOwnedChoirs(userId);
  return choirs.length;
}
