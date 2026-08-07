import { z } from 'zod';
import { toDateInputValue } from '@/utils/date';

export const MAX_TAGS = 5;

export const toLogFilename = (date: string) => toDateInputValue(new Date(date));

export const maxLogDate = toDateInputValue(new Date());
export const minLogDate = (() => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return toDateInputValue(oneMonthAgo);
})();

export const normalizeTag = (raw: string) => raw.trim().replace(/^#/, '');

export const devLogFormSchema = z.object({
  logDate: z
    .string()
    .refine((value) => value >= minLogDate && value <= maxLogDate, {
      message: '날짜는 오늘부터 과거 최대 1개월 이내여야 해요.',
    }),
  learnedNote: z.string().trim().min(1, '오늘 배운 점은 필수 입력이에요.'),
  troubleshootingNote: z.string().trim().optional(),
  tomorrowTask: z.string().trim().optional(),
  tags: z.array(z.string()).max(MAX_TAGS, `태그는 최대 ${MAX_TAGS}개까지만 붙일 수 있어요.`),
});

export type DevLogFormValues = z.infer<typeof devLogFormSchema>;
