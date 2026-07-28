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

export interface DevLogFilter {
  search?: string;
  tag?: string;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface CurrentUser {
  id: string;
  displayName: string;
  email: string | null;
  provider: 'GOOGLE' | 'KAKAO';
}

export interface DevLogStats {
  totalCount: number;
  topTags: PopularTag[];
}
