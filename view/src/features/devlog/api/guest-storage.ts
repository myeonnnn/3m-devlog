import {
  CreateDevLogInput,
  DevLog,
  DevLogFilter,
  PopularTag,
  UpdateDevLogInput,
} from '../types';
import { normalizeTag } from '../rules/devlog-form';

const STORAGE_KEY = 'devlog:guest-logs';

/** 대소문자 무관 중복 제거, 최초 입력값을 표시용으로 유지 (서버 쪽 규칙과 동일). */
function dedupeTags(rawTags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of rawTags) {
    const displayName = normalizeTag(raw);
    if (!displayName) continue;
    const normalized = displayName.toLowerCase();
    if (!seen.has(normalized)) seen.set(normalized, displayName);
  }
  return [...seen.values()];
}

function readAll(): DevLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DevLog[]) : [];
  } catch {
    return [];
  }
}

function writeAll(logs: DevLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export const guestStorage = {
  list(filter: DevLogFilter = {}): DevLog[] {
    let logs = readAll();

    if (filter.tag) {
      const target = filter.tag.trim().toLowerCase();
      logs = logs.filter((log) =>
        log.tags.some((tag) => tag.toLowerCase() === target),
      );
    }

    if (filter.search) {
      const keyword = filter.search.trim().toLowerCase();
      logs = logs.filter((log) =>
        [log.learnedNote, log.troubleshootingNote, log.tomorrowTask].some(
          (field) => field?.toLowerCase().includes(keyword),
        ),
      );
    }

    return [...logs].sort((a, b) => (a.logDate < b.logDate ? 1 : -1));
  },

  create(input: CreateDevLogInput): DevLog {
    const now = new Date().toISOString();
    const devLog: DevLog = {
      id: crypto.randomUUID(),
      ownerId: 'guest',
      logDate: input.logDate,
      learnedNote: input.learnedNote,
      troubleshootingNote: input.troubleshootingNote ?? null,
      tomorrowTask: input.tomorrowTask ?? null,
      tags: dedupeTags(input.tags ?? []),
      createdAt: now,
      updatedAt: now,
    };
    const logs = readAll();
    logs.push(devLog);
    writeAll(logs);
    return devLog;
  },

  update(id: string, input: UpdateDevLogInput): DevLog {
    const logs = readAll();
    const index = logs.findIndex((log) => log.id === id);
    if (index === -1) {
      throw new Error('게스트 로그를 찾을 수 없어요.');
    }

    const updated: DevLog = {
      ...logs[index],
      ...(input.logDate && { logDate: input.logDate }),
      ...(input.learnedNote && { learnedNote: input.learnedNote }),
      ...(input.troubleshootingNote !== undefined && {
        troubleshootingNote: input.troubleshootingNote ?? null,
      }),
      ...(input.tomorrowTask !== undefined && {
        tomorrowTask: input.tomorrowTask ?? null,
      }),
      ...(input.tags && { tags: dedupeTags(input.tags) }),
      updatedAt: new Date().toISOString(),
    };
    logs[index] = updated;
    writeAll(logs);
    return updated;
  },

  remove(id: string): void {
    writeAll(readAll().filter((log) => log.id !== id));
  },

  popularTags(): PopularTag[] {
    const counts = new Map<string, PopularTag>();
    for (const log of readAll()) {
      for (const tag of log.tags) {
        const key = tag.toLowerCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { tag, count: 1 });
        }
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  },
};
