import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { DevLogSummaryInput, GeneratedInsight, InsightGenerator } from './insight-generator.port';

const JSON_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    summary: { type: 'string' },
    patterns: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'patterns'],
});

// 순수 텍스트 생성만 필요하므로 파일시스템/네트워크 도구는 전부 차단한다.
const DISALLOWED_TOOLS = 'Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,NotebookEdit';

function buildPrompt(logs: DevLogSummaryInput[]): string {
  const entries = logs
    .map((log, i) => {
      const lines = [`[${i + 1}] 배운 점: ${log.learnedNote}`];
      if (log.troubleshootingNote) lines.push(`    버그/시행착오: ${log.troubleshootingNote}`);
      if (log.tomorrowTask) lines.push(`    내일 할 일: ${log.tomorrowTask}`);
      if (log.tags.length > 0) lines.push(`    태그: ${log.tags.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');

  return [
    '아래는 한 개발자가 작성한 개발 기록(devlog) 목록입니다. 이 기록들을 바탕으로 회고를 작성해주세요.',
    '',
    entries,
    '',
    '다음 두 가지를 생성해주세요:',
    '1. summary: 이 기간 기록 전체에 대한 문장형 요약 (2~4문장)',
    '2. patterns: 여러 기록에서 반복적으로 나타난 문제/시행착오 패턴 (없으면 빈 배열)',
  ].join('\n');
}

function execFileP(
  command: string,
  args: string[],
  options: { cwd: string; timeout: number; maxBuffer: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.toString());
    });
  });
}

/**
 * 실제 Anthropic API 키 없이 로컬 Claude Code CLI를 서브프로세스로 실행해 인사이트를 생성한다.
 * 같은 InsightGenerator 인터페이스를 구현하는 다른 클래스로 교체하면(예: 실제 API 키 기반 구현)
 * 이 클래스 의존 없이 전환할 수 있다.
 */
@Injectable()
export class ClaudeCliInsightGenerator implements InsightGenerator {
  async generate({ logs }: { logs: DevLogSummaryInput[] }): Promise<GeneratedInsight> {
    const prompt = buildPrompt(logs);

    let stdout: string;
    try {
      stdout = await execFileP(
        'claude',
        [
          '-p',
          prompt,
          '--output-format',
          'json',
          '--json-schema',
          JSON_SCHEMA,
          '--disallowedTools',
          DISALLOWED_TOOLS,
          '--permission-mode',
          'bypassPermissions',
        ],
        { cwd: tmpdir(), timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch {
      throw new BadGatewayException('AI 인사이트 생성에 실패했어요.');
    }

    return this.parseResult(stdout);
  }

  private parseResult(stdout: string): GeneratedInsight {
    let outer: unknown;
    try {
      outer = JSON.parse(stdout);
    } catch {
      throw new BadGatewayException('AI 인사이트 생성에 실패했어요.');
    }

    const { is_error: isError, structured_output: structuredOutput } = outer as {
      is_error?: unknown;
      structured_output?: unknown;
    };
    if (isError) {
      throw new BadGatewayException('AI 인사이트 생성에 실패했어요.');
    }

    const { summary, patterns } = (structuredOutput ?? {}) as {
      summary?: unknown;
      patterns?: unknown;
    };
    if (
      typeof summary !== 'string' ||
      !Array.isArray(patterns) ||
      !patterns.every((p) => typeof p === 'string')
    ) {
      throw new BadGatewayException('AI 인사이트 생성에 실패했어요.');
    }

    return { summary, patterns: patterns as string[] };
  }
}
