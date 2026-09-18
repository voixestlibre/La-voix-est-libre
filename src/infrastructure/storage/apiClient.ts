// src/infrastructure/storage/apiClient.ts
// Client HTTP central pour l'API PHP 

const API_BASE = import.meta.env.DEV
  ? 'https://www.larminat.fr/lavoixestlibre/api'
  : `${import.meta.env.BASE_URL}api`;

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    const error = new Error(json.error ?? 'Erreur API') as any;
    error.status = res.status;
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
