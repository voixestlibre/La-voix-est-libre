// src/infrastructure/storage/authService.ts
import { apiGet, apiPost } from './apiClient';

export interface CurrentUser {
  id: number;
  email: string;
  is_admin: boolean;
  choirs_nb: number;
  choirs_delegations: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiGet<CurrentUser | null>('auth.php?action=me');
  } catch { return null; }
}

export async function login(email: string, password: string) {
  const user = await apiPost<CurrentUser>('auth.php?action=login', { email, password });
  return { email: user.email, isAdmin: user.is_admin, isNewUser: false, message: 'Connexion réussie' };
}

export async function signOut(): Promise<void> {
  await apiPost('auth.php?action=logout');
}

export async function getUserParam(email: string): Promise<CurrentUser | null> {
  try {
    return await apiGet<CurrentUser>(`users.php?action=by_email&email=${encodeURIComponent(email)}`);
  } catch { return null; }
}

export async function getUserParamId(email: string): Promise<number | null> {
  try {
    const res = await apiGet<{ id: number }>(`users.php?action=param_id&email=${encodeURIComponent(email)}`);
    return res.id;
  } catch { return null; }
}

export async function getUserDelegations(email: string): Promise<string[]> {
  try {
    return await apiGet<string[]>(`users.php?action=delegations&email=${encodeURIComponent(email)}`);
  } catch { return []; }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const res = await apiGet<{ is_admin: boolean }>('users.php?action=is_admin');
    return res.is_admin;
  } catch { return false; }
}

export async function createUserAccount(email: string, password: string): Promise<void> {
  await apiPost('users.php?action=create', { email, password, choirs_nb: 1 });
}

export async function createDelegateAccount(email: string, password: string, choirId: string) {
  return apiPost<any>('users.php?action=create_delegate', { email, password, choir_id: choirId });
}

export async function getChoirDelegates(choirId: string): Promise<string[]> {
  try {
    return await apiGet<string[]>(`users.php?action=choir_delegates&choir_id=${choirId}`);
  } catch { return []; }
}

export async function revokeDelegation(email: string, choirId: string): Promise<void> {
  await apiPost('users.php?action=revoke_delegation', { email, choir_id: choirId });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiPost('auth.php?action=request_reset', { email });
}

export async function verifyResetToken(token: string): Promise<{ email: string }> {
  return apiGet<{ email: string }>(`auth.php?action=verify_reset_token&token=${token}`);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiPost('auth.php?action=reset_password', { token, password });
}

export async function listUsers(): Promise<any[]> {
  return apiGet<any[]>('users.php?action=list');
}

export async function toggleAdmin(userId: number, value: boolean): Promise<void> {
  await apiPost(`users.php?action=toggle_admin&id=${userId}&value=${value}`);
}

export async function apiUpdateChoirsNb(userId: number, value: number): Promise<void> {
  await apiPost(`users.php?action=update_choirs_nb&id=${userId}&value=${value}`);
}