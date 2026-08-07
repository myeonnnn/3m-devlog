'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateDevLogInput, DevLog } from '../types';
import {
  MAX_TAGS,
  maxLogDate,
  minLogDate,
  normalizeTag,
  toLogFilename,
  devLogFormSchema,
  DevLogFormValues,
} from '../rules/devlog-form';
import { toDateInputValue } from '@/utils/date';
import { Button } from '@/components/button';
import { Input, Textarea } from '@/components/input';

interface DevLogFormModalProps {
  initial?: DevLog | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: CreateDevLogInput) => void;
  onClose: () => void;
}

export function DevLogFormModal({
  initial,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: DevLogFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DevLogFormValues>({
    resolver: zodResolver(devLogFormSchema),
    defaultValues: {
      logDate: initial ? toDateInputValue(new Date(initial.logDate)) : toDateInputValue(new Date()),
      learnedNote: initial?.learnedNote ?? '',
      troubleshootingNote: initial?.troubleshootingNote ?? '',
      tomorrowTask: initial?.tomorrowTask ?? '',
      tags: initial?.tags ?? [],
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const logDate = watch('logDate');
  const tags = watch('tags');

  // REVISIT: addTag도 최대 개수/중복 판단이라는 비즈니스 규칙을 담고 있어
  // handleSubmit처럼 순수 함수로 뽑는 걸 고려했으나, 분기별로 tagInput/tagError를
  // 서로 다르게(또는 그대로 안) 리셋하는 미묘한 차이가 있어 그대로 함수로 추출하면
  // 그 비대칭 동작을 깨뜨릴 위험이 있다. 이득 대비 리스크가 커서 보류.
  const addTag = () => {
    const trimmed = normalizeTag(tagInput);
    if (!trimmed) return;
    const currentTags = getValues('tags');
    if (currentTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    if (currentTags.length >= MAX_TAGS) {
      setTagError(`태그는 최대 ${MAX_TAGS}개까지만 붙일 수 있어요.`);
      return;
    }
    setValue('tags', [...currentTags, trimmed]);
    setTagInput('');
    setTagError(null);
  };

  const onValid = (data: DevLogFormValues) => {
    onSubmit({
      logDate: data.logDate,
      learnedNote: data.learnedNote,
      troubleshootingNote: data.troubleshootingNote || undefined,
      tomorrowTask: data.tomorrowTask || undefined,
      tags: data.tags,
    });
  };

  const formError = errors.learnedNote?.message ?? errors.logDate?.message ?? tagError ?? error;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-black/70 sm:p-4">
      <div className="flex h-full flex-col overflow-y-auto border-line bg-panel p-5 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:border">
        <p className="text-sm text-dim">
          $ vi {initial ? toLogFilename(initial.logDate) : logDate}.log
        </p>

        <form onSubmit={handleSubmit(onValid)} className="mt-4 flex flex-1 flex-col gap-4">
          <div>
            <label className="text-sm text-signal">date&gt;</label>
            <Input type="date" min={minLogDate} max={maxLogDate} {...register('logDate')} />
          </div>

          <div>
            <label className="text-sm text-signal">learned&gt; (필수)</label>
            <Textarea rows={3} {...register('learnedNote')} />
          </div>

          <div>
            <label className="text-sm text-signal">bug&gt;</label>
            <Textarea rows={2} {...register('troubleshootingNote')} />
          </div>

          <div>
            <label className="text-sm text-signal">next&gt;</label>
            <Textarea rows={2} {...register('tomorrowTask')} />
          </div>

          <div>
            <label className="text-sm text-signal">
              tags&gt; <span className="text-dim">({tags.length}/{MAX_TAGS})</span>
            </label>
            <Input
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
              className="disabled:opacity-50"
            />
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-dim">
                {tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => {
                        setValue(
                          'tags',
                          tags.filter((t) => t !== tag),
                        );
                        setTagError(null);
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

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-auto flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              [ 취소 ]
            </Button>
            <Button type="submit" variant="signal" disabled={isSubmitting}>
              {isSubmitting ? '[ 저장 중... ]' : '[ 저장 ]'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
