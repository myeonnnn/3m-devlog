import {
  CreateDevLogInput,
  DevLog,
  DevLogFilter,
  PopularTag,
  UpdateDevLogInput,
} from './types';
import { getOrCreateUserId } from './user-id';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getOrCreateUserId(),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? res.statusText;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const devlogApi = {
  list(filter: DevLogFilter = {}): Promise<DevLog[]> {
    const params = new URLSearchParams();
    if (filter.search) params.set('search', filter.search);
    if (filter.tag) params.set('tag', filter.tag);
    const query = params.toString();
    return request<DevLog[]>(`/devlogs${query ? `?${query}` : ''}`);
  },

  get(id: string): Promise<DevLog> {
    return request<DevLog>(`/devlogs/${id}`);
  },

  create(input: CreateDevLogInput): Promise<DevLog> {
    return request<DevLog>('/devlogs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateDevLogInput): Promise<DevLog> {
    return request<DevLog>(`/devlogs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/devlogs/${id}`, { method: 'DELETE' });
  },

  popularTags(): Promise<PopularTag[]> {
    return request<PopularTag[]>('/devlogs/tags/popular');
  },
};
