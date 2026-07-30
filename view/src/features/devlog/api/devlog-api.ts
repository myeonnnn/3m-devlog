import {
  CreateDevLogInput,
  DevLog,
  DevLogFilter,
  DevLogPage,
  DevLogStats,
  PopularTag,
  UpdateDevLogInput,
} from '../types';
import { request } from '@/lib/api-client';

export const devlogApi = {
  list(filter: DevLogFilter = {}, cursor?: string): Promise<DevLogPage> {
    const params = new URLSearchParams();
    if (filter.search) params.set('search', filter.search);
    if (filter.tag) params.set('tag', filter.tag);
    if (filter.period && filter.period !== 'all') params.set('period', filter.period);
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();
    return request<DevLogPage>(`/devlogs${query ? `?${query}` : ''}`);
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

  stats(): Promise<DevLogStats> {
    return request<DevLogStats>('/devlogs/stats');
  },

  streak(): Promise<{ days: number }> {
    return request<{ days: number }>('/devlogs/streak');
  },
};
