'use client';

import { useState } from 'react';
import { CreateDevLogInput, DevLog } from '@/lib/types';
import {
  MAX_TAGS,
  maxLogDate,
  minLogDate,
  normalizeTag,
  toDateInputValue,
  toLogFilename,
  validateDevLogForm,
} from '@/lib/devlog-form';

interface DevLogFormModalProps {
  initial?: DevLog | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: CreateDevLogInput) => void;
  onClose: () => void;
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

  // REVISIT: addTag도 최대 개수/중복 판단이라는 비즈니스 규칙을 담고 있어
  // handleSubmit처럼 순수 함수로 뽑는 걸 고려했으나, 분기별로 tagInput/validationError를
  // 서로 다르게(또는 그대로 안) 리셋하는 미묘한 차이가 있어 그대로 함수로 추출하면
  // 그 비대칭 동작을 깨뜨릴 위험이 있다. 이득 대비 리스크가 커서 보류.
  const addTag = () => {
    const trimmed = normalizeTag(tagInput);
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setValidationError(`태그는 최대 ${MAX_TAGS}개까지만 붙일 수 있어요.`);
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionError = validateDevLogForm(learnedNote, logDate, minLogDate, maxLogDate);
    if (submissionError) {
      setValidationError(submissionError);
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
  };

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
              min={minLogDate}
              max={maxLogDate}
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
            <label className="text-sm text-signal">
              tags&gt; <span className="text-dim">({tags.length}/{MAX_TAGS})</span>
            </label>
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
              disabled={tags.length >= MAX_TAGS}
              placeholder={
                tags.length >= MAX_TAGS
                  ? '태그 최대 개수에 도달했어요'
                  : '# 붙이거나 입력 후 Enter'
              }
              className={`${fieldClass} disabled:opacity-50`}
            />
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-dim">
                {tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => {
                        setTags(tags.filter((t) => t !== tag));
                        setValidationError(null);
                      }}
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
