export interface DevLog {
  id: string;
  ownerId: string;
  logDate: string;
  learnedNote: string;
  troubleshootingNote: string | null;
  tomorrowTask: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDevLogInput {
  logDate: string;
  learnedNote: string;
  troubleshootingNote?: string;
  tomorrowTask?: string;
  tags?: string[];
}

export type UpdateDevLogInput = Partial<CreateDevLogInput>;

export type DevLogPeriod = 'recent7' | 'recent30' | 'all';

export interface DevLogFilter {
  search?: string;
  tag?: string;
  period?: DevLogPeriod;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface DevLogStats {
  totalCount: number;
  topTags: PopularTag[];
}

export interface DevLogPage {
  items: DevLog[];
  nextCursor: string | null;
}
