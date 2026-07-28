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

const fieldClass =
  'mt-1 w-full border border-line bg-ink px-3 py-2.5 text-sm text-text placeholder:text-dim placeholder:italic focus:border-signal focus:outline-none';

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
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-black/70 sm:p-4">
      <div className="flex h-full flex-col overflow-y-auto border-line bg-panel p-5 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:border">
        <p className="text-sm text-dim">
          $ vi {initial ? toLogFilename(initial.logDate) : logDate}.log
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-1 flex-col gap-4">
          <div>
            <label className="text-sm text-signal">date&gt;</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="text-sm text-signal">learned&gt; (필수)</label>
            <textarea
              value={learnedNote}
              onChange={(e) => setLearnedNote(e.target.value)}
              rows={3}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="text-sm text-signal">bug&gt;</label>
            <textarea
              value={troubleshootingNote}
              onChange={(e) => setTroubleshootingNote(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="text-sm text-signal">next&gt;</label>
            <textarea
              value={tomorrowTask}
              onChange={(e) => setTomorrowTask(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="text-sm text-signal">tags&gt;</label>
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
              className={fieldClass}
            />
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-dim">
                {tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      aria-label={`${tag} 태그 삭제`}
                      className="flex h-6 w-6 items-center justify-center text-dim hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(validationError || error) && (
            <p className="text-sm text-danger">{validationError ?? error}</p>
          )}

          <div className="mt-auto flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center border border-line px-4 text-sm text-dim hover:text-text"
            >
              [ 취소 ]
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 items-center border border-signal px-4 text-sm text-signal disabled:opacity-50"
            >
              {isSubmitting ? '[ 저장 중... ]' : '[ 저장 ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLogFilename(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}
