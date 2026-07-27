import {
  CreateDevLogInput,
  DevLog,
  DevLogFilter,
  PopularTag,
  UpdateDevLogInput,
} from './types';
import { request } from './api-client';

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
