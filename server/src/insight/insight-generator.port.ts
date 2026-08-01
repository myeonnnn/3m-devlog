export interface DevLogSummaryInput {
  learnedNote: string;
  troubleshootingNote: string | null;
  tomorrowTask: string | null;
  tags: string[];
}

export interface GeneratedInsight {
  summary: string;
  patterns: string[];
}

export interface InsightGenerator {
  generate(input: { logs: DevLogSummaryInput[] }): Promise<GeneratedInsight>;
}

export const INSIGHT_GENERATOR = Symbol('INSIGHT_GENERATOR');
