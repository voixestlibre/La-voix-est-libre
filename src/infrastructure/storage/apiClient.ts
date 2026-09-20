// src/infrastructure/storage/apiClient.ts
// Client HTTP central pour l'API PHP 

const API_BASE = import.meta.env.DEV
  ? 'https://www.larminat.fr/lavoixestlibre/api'
  : `${import.meta.env.BASE_URL}api`;

// Token en cache avec expiration
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getApiToken(): Promise<string> {
  const now = Date.now();
  if (!cachedToken || cachedToken.expiresAt - now < 10_000) {
    try {
      const res = await fetch(`${API_BASE}/auth.php?action=get_token`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      cachedToken = {
        value: json.data.token,
        expiresAt: now + 55_000,
      };
    } catch {
      // En cas d'échec, retourner le token expiré s'il existe
      // plutôt que de bloquer toutes les requêtes
      if (cachedToken) return cachedToken.value;
      throw new Error('Impossible d\'obtenir un token API');
    }
  }
  return cachedToken.value;
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/${path}`;
  const token = await getApiToken();
  
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': token,
      ...(options.headers ?? {}),
    },
  });

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    const error = new Error(json.error ?? 'Erreur API') as any;
    error.status = res.status;
    if (res.status === 403) cachedToken = null;
    throw error;
  }
  return json.data as T;
}

export function apiGet<T = any>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = any>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
