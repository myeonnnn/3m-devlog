import type {
  CreateDevLogDto,
  DevLogPageResponseDto,
  DevLogResponseDto,
  DevLogStatsResponseDto,
  PopularTagResponseDto,
  UpdateDevLogDto,
} from '@/lib/api/generated/types.gen';

export type DevLog = DevLogResponseDto;

export type CreateDevLogInput = CreateDevLogDto;

export type UpdateDevLogInput = UpdateDevLogDto;

export type DevLogPeriod = 'recent7' | 'recent30' | 'all';

export interface DevLogFilter {
  search?: string;
  tag?: string;
  period?: DevLogPeriod;
}

export type PopularTag = PopularTagResponseDto;

export type DevLogStats = DevLogStatsResponseDto;

export type DevLogPage = DevLogPageResponseDto;
