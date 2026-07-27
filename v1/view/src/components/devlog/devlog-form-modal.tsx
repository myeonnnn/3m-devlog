'use client';

import { useState } from 'react';
import { CreateDevLogInput, DevLog } from '@/lib/types';

interface DevLogFormModalProps {
  initial?: DevLog | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: CreateDevLogInput) => void;
  onClose: () => void;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function DevLogFormModal({
  initial,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: DevLogFormModalProps) {
  const [logDate, setLogDate] = useState(
    initial ? toDateInputValue(new Date(initial.logDate)) : toDateInputValue(new Date()),
  );
  const [learnedNote, setLearnedNote] = useState(initial?.learnedNote ?? '');
  const [troubleshootingNote, setTroubleshootingNote] = useState(
    initial?.troubleshootingNote ?? '',
  );
  const [tomorrowTask, setTomorrowTask] = useState(initial?.tomorrowTask ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function addTag() {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!learnedNote.trim()) {
      setValidationError('오늘 배운 점은 필수 입력이에요.');
      return;
    }
    setValidationError(null);
    onSubmit({
      logDate,
      learnedNote: learnedNote.trim(),
      troubleshootingNote: troubleshootingNote.trim() || undefined,
      tomorrowTask: tomorrowTask.trim() || undefined,
      tags,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-100">
        <h2 className="text-lg font-semibold">
          {initial ? '로그 수정' : '오늘의 로그 작성'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-neutral-400">날짜</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">
              💡 오늘 배운 점 (필수)
            </label>
            <textarea
              value={learnedNote}
              onChange={(e) => setLearnedNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">
              🐛 해결한 버그 / 시행착오
            </label>
            <textarea
              value={troubleshootingNote}
              onChange={(e) => setTroubleshootingNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">📌 내일 할 일</label>
            <textarea
              value={tomorrowTask}
              onChange={(e) => setTomorrowTask(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">태그</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="# 붙이거나 입력 후 Enter"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-emerald-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="text-neutral-500 hover:text-neutral-200"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(validationError || error) && (
            <p className="text-sm text-red-400">{validationError ?? error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-neutral-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
