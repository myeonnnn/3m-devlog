# AI 회고 요약 & 성장 인사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 사용자가 본인 DevLog 기반 주간(ISO 주차)/월간(캘린더월) AI 회고 요약(문장 요약 + 반복 패턴 + 활동 수치)을 원할 때 생성해 보고, 마이페이지에서 기간당 최신 결과를 다시 볼 수 있게 한다.

**Architecture:** 새 `Insight` 바운디드 컨텍스트(서버 `src/insight/`, 클라이언트 `features/insight/`)를 DevLog를 읽기 전용으로 참조하는 형태로 추가한다. AI 호출은 `InsightGenerator` 포트 뒤에 숨기고, 이번 범위에서는 로컬 `claude` CLI를 서브프로세스로 실행하는 어댑터로 구현한다(추후 실제 API 키 어댑터로 교체 가능). 클라이언트는 순수 기간 계산 로직(`rules/`)과 프레젠테이션 전용 모달을 분리해, 네트워크 훅 없이도 모달의 분기 렌더링을 테스트할 수 있게 한다.

**Tech Stack:** NestJS 11 / Prisma 7 (PostgreSQL, `String[]` 배열 컬럼) / Next.js 16 + TanStack React Query / Vitest·RTL(클라이언트) / Jest·supertest(서버) / 로컬 `claude` CLI 서브프로세스(child_process.execFile).

## Global Constraints

- 참조 스펙: [`docs/superpowers/specs/2026-08-01-ai-insight-design.md`](../specs/2026-08-01-ai-insight-design.md) (이번 계획의 모든 태스크는 이 스펙에서 파생됨. 스펙과 충돌하면 스펙이 우선.)
- Node는 반드시 LTS(v24+). 이 레포에서 Node/npm 명령을 실행하는 모든 Run 커맨드 앞에는 `source $(brew --prefix nvm)/nvm.sh && nvm use default &&`를 붙인다 (Bash 툴이 커맨드마다 새 셸을 띄우기 때문에 `nvm use`가 다음 호출에 남지 않음).
- 서버는 `server/` 디렉터리에서, 클라이언트는 `view/` 디렉터리에서 작업한다. 각 Run 커맨드는 해당 디렉터리 기준 상대 경로다.
- Prisma 마이그레이션/e2e 전에는 Postgres가 떠 있어야 한다 (`cd server && docker compose up -d`, 최초 1회).
- 각 태스크 끝의 커밋은 개별 커밋으로 남긴다 (한 번에 몰아서 커밋하지 않음).
- 클라이언트 폴더 구조/테스트 위치는 `view/CLAUDE.md`의 기능(도메인) 기준 구조(`features/<name>/{api,components,hooks,rules,types}`, 테스트는 각 하위 폴더의 `__tests__/`)를 그대로 따른다.
- 서버 폴더 구조는 기존 `src/devlog/`, `src/users/` 모듈 패턴(컨트롤러/서비스/DTO, 테스트는 `*.spec.ts`로 소스 옆에)을 따른다.
- 이 코드베이스는 `vi.mock`/모듈 목킹을 쓰지 않는 관례가 있다 (네트워크 훅은 아예 단위 테스트하지 않고, 프레젠테이션 컴포넌트는 순수 props로 테스트). 이 계획도 그 관례를 따른다 — Task 15/16/17 참고.

---

## Part A — 서버 (`server/`)

### Task 1: Prisma 스키마에 Insight 모델 추가 + 마이그레이션

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: `InsightPeriodType` enum(`WEEKLY`/`MONTHLY`), `Insight` 모델(`id, ownerId, periodType, periodKey, summary, patterns: String[], logCount, generatedAt`), 유니크 제약 `ownerId_periodType_periodKey` — 이후 모든 서버 태스크가 이 이름의 Prisma delegate(`prisma.insight`)와 upsert `where` 키를 그대로 사용함.

- [ ] **Step 1: `schema.prisma`에 enum과 모델 추가**

`server/prisma/schema.prisma` 끝에 추가:

```prisma
enum InsightPeriodType {
  WEEKLY
  MONTHLY
}

model Insight {
  id          String            @id @default(uuid())
  ownerId     String
  periodType  InsightPeriodType
  periodKey   String
  summary     String
  patterns    String[]
  logCount    Int
  generatedAt DateTime          @default(now())

  @@unique([ownerId, periodType, periodKey])
  @@index([ownerId])
}
```

- [ ] **Step 2: Postgres 기동 확인 후 마이그레이션 생성/적용**

Run:
```bash
cd server
docker compose up -d
source $(brew --prefix nvm)/nvm.sh && nvm use default && npx prisma migrate dev --name add_insight
```
Expected: 마이그레이션 파일이 `server/prisma/migrations/`에 새로 생성되고, `generated/prisma`에 `Insight`/`InsightPeriodType` 타입이 반영됨. 에러 없이 종료.

- [ ] **Step 3: 커밋**

```bash
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(server): Insight 모델/마이그레이션 추가"
```

---

### Task 2: 기간 계산 순수 함수 (`period.ts`)

periodKey(`"2026-W31"` | `"2026-08"`) 검증, 미래 기간 거부, 실제 날짜 범위(`[start, end)`) 변환을 담당하는 순수 함수. ISO 주차 계산은 "목요일이 속한 주의 연도"로 ISO 연도를 정하는 표준 알고리즘을 쓴다.

**Files:**
- Create: `server/src/insight/period.ts`
- Test: `server/src/insight/period.spec.ts`

**Interfaces:**
- Produces:
  - `currentPeriodKey(periodType: InsightPeriodType, now?: Date): string`
  - `resolvePeriodRange(periodType: InsightPeriodType, periodKey: string, now?: Date): { start: Date; end: Date }` — `periodKey` 형식이 잘못됐거나 미래면 `BadRequestException`을 던짐. `end`는 배타적(exclusive) 상한.
- Consumes: `InsightPeriodType` enum from `../../generated/prisma/enums` (Task 1에서 생성됨)

- [ ] **Step 1: 실패하는 테스트 작성**

`server/src/insight/period.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';
import { currentPeriodKey, resolvePeriodRange } from './period';

describe('currentPeriodKey', () => {
  it.each([
    ['2026-08-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W31'],
    ['2026-01-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W01'],
    ['2025-12-31T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W01'], // 해가 바뀌기 전날이 다음 ISO 연도 1주차인 경우
    ['2026-12-31T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W53'], // 2026년은 ISO 53주차가 있음
    ['2027-01-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W53'], // 새해 첫날이 전년도 53주차인 경우
    ['2026-08-01T00:00:00Z', InsightPeriodType.MONTHLY, '2026-08'],
    ['2026-12-31T00:00:00Z', InsightPeriodType.MONTHLY, '2026-12'],
  ])('now=%s, periodType=%s -> %s', (now, periodType, expected) => {
    expect(currentPeriodKey(periodType, new Date(now))).toBe(expected);
  });
});

describe('resolvePeriodRange', () => {
  const now = new Date('2026-08-01T00:00:00Z'); // 2026-W31, 2026-08

  it('주간: 형식이 맞으면 월요일~다음 월요일(배타) 범위를 반환한다', () => {
    const { start, end } = resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W31', now);
    expect(start.toISOString()).toBe('2026-07-27T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-03T00:00:00.000Z');
  });

  it('주간: 연도 경계(2026-W01)도 올바른 월요일을 반환한다', () => {
    const { start } = resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W01', now);
    expect(start.toISOString()).toBe('2025-12-29T00:00:00.000Z');
  });

  it('월간: 1일~다음달 1일(배타) 범위를 반환한다', () => {
    const { start, end } = resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-08', now);
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('형식이 잘못된 주간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-8', now)).toThrow(
      BadRequestException,
    );
  });

  it('형식이 잘못된 월간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026/08', now)).toThrow(
      BadRequestException,
    );
  });

  it('미래 주간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W32', now)).toThrow(
      BadRequestException,
    );
  });

  it('미래 월간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-09', now)).toThrow(
      BadRequestException,
    );
  });

  it('현재(오늘이 속한) 기간은 미래가 아니므로 허용된다', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W31', now)).not.toThrow();
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-08', now)).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/period.spec.ts`
Expected: FAIL — `Cannot find module './period'`

- [ ] **Step 3: 구현**

`server/src/insight/period.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO 8601 주차: 그 날짜가 속한 주의 목요일이 속한 연도를 ISO 연도로 삼는다. */
function getIsoWeek(date: Date): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, isoWeek };
}

/** ISO 연도의 1/4일은 항상 그 연도 1주차에 속한다는 규칙으로 N주차의 월요일(UTC 00:00)을 구한다. */
function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return start;
}

export function currentPeriodKey(periodType: InsightPeriodType, now = new Date()): string {
  if (periodType === InsightPeriodType.WEEKLY) {
    const { isoYear, isoWeek } = getIsoWeek(now);
    return `${isoYear}-W${pad2(isoWeek)}`;
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

export interface PeriodRange {
  start: Date;
  end: Date; // 배타적 상한
}

/** periodKey 형식/미래 여부를 검증하고 조회용 [start, end) 날짜 범위를 반환한다. */
export function resolvePeriodRange(
  periodType: InsightPeriodType,
  periodKey: string,
  now = new Date(),
): PeriodRange {
  return periodType === InsightPeriodType.WEEKLY
    ? resolveWeeklyRange(periodKey, now)
    : resolveMonthlyRange(periodKey, now);
}

function assertNotFuture(periodType: InsightPeriodType, periodKey: string, now: Date) {
  // periodKey가 항상 zero-padded 고정폭 형식이라 문자열 비교로 미래 여부를 안전하게 판단할 수 있다.
  if (periodKey > currentPeriodKey(periodType, now)) {
    throw new BadRequestException('미래 기간은 선택할 수 없어요.');
  }
}

function resolveWeeklyRange(periodKey: string, now: Date): PeriodRange {
  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  const isoWeek = match ? Number(match[2]) : NaN;
  if (!match || isoWeek < 1 || isoWeek > 53) {
    throw new BadRequestException('periodKey 형식이 올바르지 않아요. 예: 2026-W31');
  }
  assertNotFuture(InsightPeriodType.WEEKLY, periodKey, now);

  const isoYear = Number(match[1]);
  const start = isoWeekMonday(isoYear, isoWeek);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function resolveMonthlyRange(periodKey: string, now: Date): PeriodRange {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  const month = match ? Number(match[2]) : NaN;
  if (!match || month < 1 || month > 12) {
    throw new BadRequestException('periodKey 형식이 올바르지 않아요. 예: 2026-08');
  }
  assertNotFuture(InsightPeriodType.MONTHLY, periodKey, now);

  const year = Number(match[1]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/period.spec.ts`
Expected: PASS (전체 케이스)

- [ ] **Step 5: 커밋**

```bash
git add server/src/insight/period.ts server/src/insight/period.spec.ts
git commit -m "feat(server): 인사이트 기간(ISO 주차/캘린더월) 계산 순수 함수 추가"
```

---

### Task 3: `InsightGenerator` 포트 정의

**Files:**
- Create: `server/src/insight/insight-generator.port.ts`

**Interfaces:**
- Produces: `DevLogSummaryInput`, `GeneratedInsight`, `InsightGenerator` 인터페이스, `INSIGHT_GENERATOR` DI 토큰 — Task 4(어댑터 구현), Task 6(서비스), Task 7(모듈 바인딩)이 그대로 사용.

- [ ] **Step 1: 작성 (순수 타입 정의라 테스트 불필요)**

`server/src/insight/insight-generator.port.ts`:

```ts
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
```

- [ ] **Step 2: 커밋**

```bash
git add server/src/insight/insight-generator.port.ts
git commit -m "feat(server): InsightGenerator 포트 정의"
```

---

### Task 4: `ClaudeCliInsightGenerator` (로컬 CLI 서브프로세스 어댑터)

실제 Anthropic API 키 없이, 로컬에 설치된 `claude` CLI를 서브프로세스로 실행해 인사이트를 생성한다. 아래 CLI 응답 형태는 실제로 다음 커맨드를 실행해 확인한 값이다 (구현 전 직접 검증 완료, 추측 아님):

```bash
claude -p "<prompt>" --output-format json \
  --json-schema '{"type":"object","properties":{"summary":{"type":"string"},"patterns":{"type":"array","items":{"type":"string"}}},"required":["summary","patterns"]}' \
  --disallowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,NotebookEdit" \
  --permission-mode bypassPermissions
```

stdout은 JSON 한 덩어리이고, 관련 필드는 `is_error: boolean`과 `structured_output: { summary, patterns }`(스키마와 동일한 형태로 이미 파싱되어 들어옴 — `result` 필드는 같은 내용의 문자열이라 쓸 필요 없음).

**Files:**
- Create: `server/src/insight/claude-cli-insight-generator.ts`
- Test: `server/src/insight/claude-cli-insight-generator.spec.ts`

**Interfaces:**
- Consumes: `DevLogSummaryInput`, `GeneratedInsight`, `InsightGenerator` (Task 3)
- Produces: `ClaudeCliInsightGenerator` 클래스 (Task 7에서 `INSIGHT_GENERATOR` 토큰의 구현체로 등록)

- [ ] **Step 1: 실패하는 테스트 작성**

`server/src/insight/claude-cli-insight-generator.spec.ts`:

```ts
import { execFile } from 'node:child_process';
import { BadGatewayException } from '@nestjs/common';
import { ClaudeCliInsightGenerator } from './claude-cli-insight-generator';

jest.mock('node:child_process');

const mockExecFile = execFile as unknown as jest.Mock;

function mockCliStdout(stdout: string) {
  mockExecFile.mockImplementation((_cmd, _args, _options, callback) => {
    callback(null, stdout, '');
  });
}

function mockCliError(error: Error) {
  mockExecFile.mockImplementation((_cmd, _args, _options, callback) => {
    callback(error, '', '');
  });
}

describe('ClaudeCliInsightGenerator', () => {
  let generator: ClaudeCliInsightGenerator;
  const logs = [{ learnedNote: '배운 것', troubleshootingNote: null, tomorrowTask: null, tags: [] }];

  beforeEach(() => {
    generator = new ClaudeCliInsightGenerator();
    mockExecFile.mockReset();
  });

  it('is_error가 false고 structured_output이 스키마에 맞으면 summary/patterns를 반환한다', async () => {
    mockCliStdout(
      JSON.stringify({
        is_error: false,
        structured_output: { summary: '요약', patterns: ['패턴1', '패턴2'] },
      }),
    );

    const result = await generator.generate({ logs });

    expect(result).toEqual({ summary: '요약', patterns: ['패턴1', '패턴2'] });
  });

  it('CLI 프로세스가 에러로 종료하면 BadGatewayException을 던진다', async () => {
    mockCliError(new Error('command not found'));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('is_error가 true면 BadGatewayException을 던진다', async () => {
    mockCliStdout(JSON.stringify({ is_error: true }));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('structured_output이 스키마와 다르면 BadGatewayException을 던진다', async () => {
    mockCliStdout(JSON.stringify({ is_error: false, structured_output: { summary: 123 } }));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('stdout이 JSON이 아니면 BadGatewayException을 던진다', async () => {
    mockCliStdout('not json');

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/claude-cli-insight-generator.spec.ts`
Expected: FAIL — `Cannot find module './claude-cli-insight-generator'`

- [ ] **Step 3: 구현**

`server/src/insight/claude-cli-insight-generator.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/claude-cli-insight-generator.spec.ts`
Expected: PASS (5개 케이스)

- [ ] **Step 5: 커밋**

```bash
git add server/src/insight/claude-cli-insight-generator.ts server/src/insight/claude-cli-insight-generator.spec.ts
git commit -m "feat(server): claude CLI 서브프로세스 기반 InsightGenerator 어댑터 추가"
```

---

### Task 5: `GenerateInsightDto`

**Files:**
- Create: `server/src/insight/dto/generate-insight.dto.ts`

**Interfaces:**
- Produces: `GenerateInsightDto { periodType: InsightPeriodType; periodKey: string }` — Task 7 컨트롤러가 사용.

- [ ] **Step 1: 작성 (기존 `CreateDevLogDto`와 동일하게 DTO 자체는 별도 spec 없이 e2e로 검증)**

`server/src/insight/dto/generate-insight.dto.ts`:

```ts
import { IsIn, IsString } from 'class-validator';
import { InsightPeriodType } from '../../../generated/prisma/enums';

export class GenerateInsightDto {
  @IsIn(Object.values(InsightPeriodType))
  periodType: InsightPeriodType;

  @IsString()
  periodKey: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add server/src/insight/dto/generate-insight.dto.ts
git commit -m "feat(server): GenerateInsightDto 추가"
```

---

### Task 6: `InsightService` (generate/latest 오케스트레이션)

**Files:**
- Create: `server/src/insight/insight.service.ts`
- Test: `server/src/insight/insight.service.spec.ts`

**Interfaces:**
- Consumes: `resolvePeriodRange` (Task 2), `InsightGenerator`/`INSIGHT_GENERATOR` (Task 3), `PrismaService`(`prisma.devLog.findMany`, `prisma.insight.upsert`, `prisma.insight.findFirst` — Task 1 스키마)
- Produces: `InsightService.generate(ownerId, periodType, periodKey): Promise<Insight>`, `InsightService.latest(ownerId): Promise<{ weekly: Insight | null; monthly: Insight | null }>` — Task 7 컨트롤러가 그대로 호출.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/src/insight/insight.service.spec.ts`:

```ts
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';
import { InsightService } from './insight.service';
import { PrismaService } from '../prisma/prisma.service';
import { InsightGenerator } from './insight-generator.port';

type MockPrisma = {
  devLog: { findMany: jest.Mock };
  insight: { upsert: jest.Mock; findFirst: jest.Mock };
};

function createPrismaMock(): MockPrisma {
  return {
    devLog: { findMany: jest.fn() },
    insight: { upsert: jest.fn(), findFirst: jest.fn() },
  };
}

function createGeneratorMock(): jest.Mocked<InsightGenerator> {
  return { generate: jest.fn() };
}

describe('InsightService', () => {
  let service: InsightService;
  let prisma: MockPrisma;
  let generator: jest.Mocked<InsightGenerator>;
  const ownerId = 'owner-1';

  beforeEach(() => {
    prisma = createPrismaMock();
    generator = createGeneratorMock();
    service = new InsightService(prisma as unknown as PrismaService, generator);
  });

  describe('generate', () => {
    it('형식이 잘못된 periodKey는 400이고 DB/AI를 호출하지 않는다', async () => {
      await expect(
        service.generate(ownerId, InsightPeriodType.WEEKLY, 'not-a-key'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.devLog.findMany).not.toHaveBeenCalled();
      expect(generator.generate).not.toHaveBeenCalled();
    });

    it('미래 기간은 400', async () => {
      await expect(
        service.generate(ownerId, InsightPeriodType.MONTHLY, '2999-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('로그가 0건이면 AI를 호출하지 않고 422', async () => {
      prisma.devLog.findMany.mockResolvedValue([]);

      await expect(
        service.generate(ownerId, InsightPeriodType.MONTHLY, '2026-08'),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(generator.generate).not.toHaveBeenCalled();
    });

    it('로그가 있으면 AI를 호출하고 logCount와 함께 upsert한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([
        { learnedNote: 'a', troubleshootingNote: null, tomorrowTask: null, tags: [] },
        {
          learnedNote: 'b',
          troubleshootingNote: '버그',
          tomorrowTask: null,
          tags: [{ tag: { displayName: 'react' } }],
        },
      ]);
      generator.generate.mockResolvedValue({ summary: '요약', patterns: ['패턴1'] });
      prisma.insight.upsert.mockResolvedValue({
        id: 'insight-1',
        ownerId,
        periodType: InsightPeriodType.MONTHLY,
        periodKey: '2026-08',
        summary: '요약',
        patterns: ['패턴1'],
        logCount: 2,
        generatedAt: new Date(),
      });

      const result = await service.generate(ownerId, InsightPeriodType.MONTHLY, '2026-08');

      expect(generator.generate).toHaveBeenCalledWith({
        logs: [
          { learnedNote: 'a', troubleshootingNote: null, tomorrowTask: null, tags: [] },
          { learnedNote: 'b', troubleshootingNote: '버그', tomorrowTask: null, tags: ['react'] },
        ],
      });
      expect(prisma.insight.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerId_periodType_periodKey: {
              ownerId,
              periodType: InsightPeriodType.MONTHLY,
              periodKey: '2026-08',
            },
          },
          create: expect.objectContaining({ logCount: 2, summary: '요약', patterns: ['패턴1'] }),
          update: expect.objectContaining({ logCount: 2, summary: '요약', patterns: ['패턴1'] }),
        }),
      );
      expect(result.logCount).toBe(2);
    });
  });

  describe('latest', () => {
    it('주간/월간 각각 가장 최근 생성분을 반환한다', async () => {
      prisma.insight.findFirst
        .mockResolvedValueOnce({ id: 'w1', periodType: InsightPeriodType.WEEKLY })
        .mockResolvedValueOnce(null);

      const result = await service.latest(ownerId);

      expect(result).toEqual({
        weekly: { id: 'w1', periodType: InsightPeriodType.WEEKLY },
        monthly: null,
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/insight.service.spec.ts`
Expected: FAIL — `Cannot find module './insight.service'`

- [ ] **Step 3: 구현**

`server/src/insight/insight.service.ts`:

```ts
import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsightPeriodType } from '../../generated/prisma/enums';
import { resolvePeriodRange } from './period';
import { INSIGHT_GENERATOR, InsightGenerator } from './insight-generator.port';

@Injectable()
export class InsightService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(INSIGHT_GENERATOR) private readonly insightGenerator: InsightGenerator,
  ) {}

  async generate(ownerId: string, periodType: InsightPeriodType, periodKey: string) {
    const range = resolvePeriodRange(periodType, periodKey);

    const logs = await this.prisma.devLog.findMany({
      where: { ownerId, logDate: { gte: range.start, lt: range.end } },
      include: { tags: { include: { tag: true } } },
    });

    if (logs.length === 0) {
      throw new UnprocessableEntityException('해당 기간에 기록이 없어요.');
    }

    const { summary, patterns } = await this.insightGenerator.generate({
      logs: logs.map((log) => ({
        learnedNote: log.learnedNote,
        troubleshootingNote: log.troubleshootingNote,
        tomorrowTask: log.tomorrowTask,
        tags: log.tags.map((t) => t.tag.displayName),
      })),
    });

    return this.prisma.insight.upsert({
      where: { ownerId_periodType_periodKey: { ownerId, periodType, periodKey } },
      create: { ownerId, periodType, periodKey, summary, patterns, logCount: logs.length },
      update: { summary, patterns, logCount: logs.length, generatedAt: new Date() },
    });
  }

  async latest(ownerId: string) {
    const [weekly, monthly] = await Promise.all([
      this.prisma.insight.findFirst({
        where: { ownerId, periodType: InsightPeriodType.WEEKLY },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.insight.findFirst({
        where: { ownerId, periodType: InsightPeriodType.MONTHLY },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);
    return { weekly, monthly };
  }
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx jest src/insight/insight.service.spec.ts`
Expected: PASS (6개 케이스)

- [ ] **Step 5: 커밋**

```bash
git add server/src/insight/insight.service.ts server/src/insight/insight.service.spec.ts
git commit -m "feat(server): InsightService (generate/latest) 추가"
```

---

### Task 7: `InsightController` + `InsightModule` + 앱 등록

**Files:**
- Create: `server/src/insight/insight.controller.ts`
- Create: `server/src/insight/insight.module.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `InsightService`(Task 6), `GenerateInsightDto`(Task 5), `INSIGHT_GENERATOR`/`ClaudeCliInsightGenerator`(Task 3, 4), `OwnerId` 데코레이터·`JwtAuthGuard`(기존 `../common/decorators/owner-id.decorator`, `../auth/guards/jwt-auth.guard`)
- Produces: `POST /insights/generate`, `GET /insights/latest` 라우트 — Task 8 e2e와 Task 11(클라이언트 API) 계약의 기준.

- [ ] **Step 1: 컨트롤러 작성**

`server/src/insight/insight.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightService } from './insight.service';
import { GenerateInsightDto } from './dto/generate-insight.dto';

@Controller('insights')
export class InsightController {
  constructor(private readonly insightService: InsightService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(@OwnerId() ownerId: string, @Body() dto: GenerateInsightDto) {
    return this.insightService.generate(ownerId, dto.periodType, dto.periodKey);
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  latest(@OwnerId() ownerId: string) {
    return this.insightService.latest(ownerId);
  }
}
```

- [ ] **Step 2: 모듈 작성**

`server/src/insight/insight.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { INSIGHT_GENERATOR } from './insight-generator.port';
import { ClaudeCliInsightGenerator } from './claude-cli-insight-generator';

@Module({
  controllers: [InsightController],
  providers: [InsightService, { provide: INSIGHT_GENERATOR, useClass: ClaudeCliInsightGenerator }],
})
export class InsightModule {}
```

- [ ] **Step 3: `app.module.ts`에 등록**

`server/src/app.module.ts` 수정 (기존 import/imports 배열에 추가):

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DevLogModule } from './devlog/devlog.module';
import { AuthModule } from './auth/auth.module';
import { InsightModule } from './insight/insight.module';

@Module({
  imports: [PrismaModule, DevLogModule, AuthModule, InsightModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: 서버가 정상 부팅되는지 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && PORT=3001 npm run start:dev`
Expected: `Nest application successfully started` 로그, 에러 없이 뜸. 확인 후 Ctrl+C로 종료.

- [ ] **Step 5: 커밋**

```bash
git add server/src/insight/insight.controller.ts server/src/insight/insight.module.ts server/src/app.module.ts
git commit -m "feat(server): InsightController/Module 추가 및 앱에 등록"
```

---

### Task 8: e2e 테스트 (`InsightGenerator` fake로 override)

실제 `claude` CLI 호출은 느리고 비결정적이라 e2e에서는 제외한다. `Test.createTestingModule`에서 `INSIGHT_GENERATOR` 프로바이더를 고정된 가짜 구현으로 override해 나머지 흐름(인증/검증/저장/조회)만 검증한다.

**Files:**
- Create: `server/test/insight.e2e-spec.ts`

**Interfaces:**
- Consumes: `INSIGHT_GENERATOR`(Task 3), `AppModule`(Task 7), 기존 e2e 패턴(`devlog.e2e-spec.ts`의 쿠키 발급/User 시딩 방식)

- [ ] **Step 1: 작성**

`server/test/insight.e2e-spec.ts`:

```ts
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { INSIGHT_GENERATOR, InsightGenerator } from '../src/insight/insight-generator.port';
import { AuthProvider } from '../generated/prisma/enums';

describe('Insight (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const ownerId = `e2e-insight-owner-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  const fakeGenerator: InsightGenerator = {
    generate: async () => ({ summary: '가짜 요약', patterns: ['가짜 패턴'] }),
  };

  function cookieFor(userId: string) {
    return `access_token=${jwtService.sign({ sub: userId })}`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(INSIGHT_GENERATOR)
      .useValue(fakeGenerator)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    await prisma.user.create({
      data: { id: ownerId, provider: AuthProvider.GOOGLE, providerUserId: ownerId, displayName: 'e2e insight owner' },
    });
  });

  afterAll(async () => {
    await prisma.insight.deleteMany({ where: { ownerId } });
    await prisma.devLog.deleteMany({ where: { ownerId } });
    await prisma.user.delete({ where: { id: ownerId } });
    await app.close();
  });

  it('로그인 없이 요청하면 401', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .send({ periodType: 'MONTHLY', periodKey: '2026-08' })
      .expect(401);
  });

  it('해당 기간에 로그가 없으면 422를 반환하고 저장하지 않는다', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: '2020-01' })
      .expect(422);
  });

  it('미래 기간을 요청하면 400', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: '2999-01' })
      .expect(400);
  });

  it('로그가 있는 기간을 생성하면 200과 함께 저장되고, latest에서 조회된다', async () => {
    await prisma.devLog.create({
      data: { ownerId, logDate: new Date(today), learnedNote: 'e2e insight용 로그' },
    });
    const currentMonth = today.slice(0, 7);

    const generateRes = await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: currentMonth })
      .expect(200);

    expect(generateRes.body.summary).toBe('가짜 요약');
    expect(generateRes.body.logCount).toBe(1);

    const latestRes = await request(app.getHttpServer())
      .get('/insights/latest')
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    expect(latestRes.body.monthly.periodKey).toBe(currentMonth);
    expect(latestRes.body.weekly).toBeNull();
  });

  it('같은 기간을 다시 생성 요청하면 덮어써서 1건만 유지된다', async () => {
    const currentMonth = today.slice(0, 7);

    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: currentMonth })
      .expect(200);

    const count = await prisma.insight.count({
      where: { ownerId, periodType: 'MONTHLY', periodKey: currentMonth },
    });
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: 실행**

Run:
```bash
cd server
docker compose up -d
source $(brew --prefix nvm)/nvm.sh && nvm use default && NODE_OPTIONS=--experimental-vm-modules npx jest --config ./test/jest-e2e.json insight.e2e-spec.ts
```
Expected: PASS (5개 케이스). 실패하면 원인을 고쳐 통과할 때까지 반복 (예: `2020-01`처럼 과거이면서 로그가 없는 달인지, 현재 기준 미래가 아닌지 재확인).

- [ ] **Step 3: 커밋**

```bash
git add server/test/insight.e2e-spec.ts
git commit -m "test(server): 인사이트 e2e 테스트 추가 (InsightGenerator fake override)"
```

---

## Part B — 클라이언트 (`view/`)

### Task 9: 타입 정의

**Files:**
- Create: `view/src/features/insight/types/index.ts`

**Interfaces:**
- Produces: `InsightPeriodType`, `Insight`, `LatestInsights` — 이후 모든 클라이언트 태스크가 사용.

- [ ] **Step 1: 작성 (순수 타입, 테스트 불필요)**

`view/src/features/insight/types/index.ts`:

```ts
export type InsightPeriodType = 'WEEKLY' | 'MONTHLY';

export interface Insight {
  id: string;
  ownerId: string;
  periodType: InsightPeriodType;
  periodKey: string;
  summary: string;
  patterns: string[];
  logCount: number;
  generatedAt: string;
}

export interface LatestInsights {
  weekly: Insight | null;
  monthly: Insight | null;
}
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/types/index.ts
git commit -m "feat(view): 인사이트 타입 정의"
```

---

### Task 10: `api-client.ts`에 상태 코드 보존 `ApiError` 추가

인사이트 모달은 "로그 0건(422)"과 "생성 실패(502 등)"를 다른 문구로 보여줘야 하는데, 기존 `request()`는 에러 메시지 문자열만 던지고 상태 코드를 버린다. 메시지 문자열 매칭(취약함) 대신 상태 코드를 보존하는 `ApiError`를 던지도록 공유 유틸을 확장한다. 기존 호출부는 전부 `error.message`만 읽으므로(문자열 비교 없음) 이 변경으로 깨지지 않는다.

**Files:**
- Modify: `view/src/lib/api-client.ts`

**Interfaces:**
- Produces: `export class ApiError extends Error { status: number }` — Task 14에서 `error instanceof ApiError && error.status === 422`로 사용.

- [ ] **Step 1: 수정**

`view/src/lib/api-client.ts` 전체를 아래로 교체:

```ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? res.statusText;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: 기존 클라이언트 테스트/타입체크가 여전히 통과하는지 확인 (회귀 확인)**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npm test`
Expected: 기존 테스트 전부 PASS (동작 변경 없음, 상태 코드만 추가로 실림)

- [ ] **Step 3: 커밋**

```bash
git add view/src/lib/api-client.ts
git commit -m "feat(view): api-client 에러에 HTTP 상태 코드 보존 (ApiError)"
```

---

### Task 11: `insight-api.ts`

**Files:**
- Create: `view/src/features/insight/api/insight-api.ts`

**Interfaces:**
- Consumes: `request` (`@/lib/api-client`), `Insight`/`InsightPeriodType`/`LatestInsights` (Task 9)
- Produces: `insightApi.generate(periodType, periodKey)`, `insightApi.latest()` — Task 13이 사용.

- [ ] **Step 1: 작성**

`view/src/features/insight/api/insight-api.ts`:

```ts
import { request } from '@/lib/api-client';
import { Insight, InsightPeriodType, LatestInsights } from '../types';

export const insightApi = {
  generate(periodType: InsightPeriodType, periodKey: string): Promise<Insight> {
    return request<Insight>('/insights/generate', {
      method: 'POST',
      body: JSON.stringify({ periodType, periodKey }),
    });
  },

  latest(): Promise<LatestInsights> {
    return request<LatestInsights>('/insights/latest');
  },
};
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/api/insight-api.ts
git commit -m "feat(view): insight-api 클라이언트 추가"
```

---

### Task 12: 기간 계산 순수 함수 (`rules/period-key.ts`)

서버 `period.ts`(Task 2)와 동일한 ISO 주차 알고리즘을 클라이언트에서 독립적으로 구현한다 (이 레포는 view/server가 완전히 분리된 구조라 공유 패키지가 없음 — 기존 `assertLogDateInRange`류 날짜 로직도 서버/클라이언트 각자 구현되어 있는 것과 동일한 패턴).

**Files:**
- Create: `view/src/features/insight/rules/period-key.ts`
- Test: `view/src/features/insight/rules/__tests__/period-key.test.ts`

**Interfaces:**
- Consumes: `InsightPeriodType` (Task 9)
- Produces: `currentPeriodKey`, `shiftPeriodKey`, `isFuturePeriodKey`, `formatPeriodLabel` — Task 14(`useInsightController`)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`view/src/features/insight/rules/__tests__/period-key.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  currentPeriodKey,
  formatPeriodLabel,
  isFuturePeriodKey,
  shiftPeriodKey,
} from '../period-key';

describe('currentPeriodKey', () => {
  it.each([
    ['2026-08-01T00:00:00Z', 'WEEKLY' as const, '2026-W31'],
    ['2025-12-31T00:00:00Z', 'WEEKLY' as const, '2026-W01'],
    ['2026-12-31T00:00:00Z', 'WEEKLY' as const, '2026-W53'],
    ['2027-01-01T00:00:00Z', 'WEEKLY' as const, '2026-W53'],
    ['2026-08-01T00:00:00Z', 'MONTHLY' as const, '2026-08'],
  ])('now=%s, periodType=%s -> %s', (now, periodType, expected) => {
    expect(currentPeriodKey(periodType, new Date(now))).toBe(expected);
  });
});

describe('isFuturePeriodKey', () => {
  const now = new Date('2026-08-01T00:00:00Z'); // 2026-W31, 2026-08

  it('현재 기간은 미래가 아니다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W31', now)).toBe(false);
    expect(isFuturePeriodKey('MONTHLY', '2026-08', now)).toBe(false);
  });

  it('다음 주/월은 미래다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W32', now)).toBe(true);
    expect(isFuturePeriodKey('MONTHLY', '2026-09', now)).toBe(true);
  });

  it('과거 기간은 미래가 아니다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W01', now)).toBe(false);
    expect(isFuturePeriodKey('MONTHLY', '2025-12', now)).toBe(false);
  });
});

describe('shiftPeriodKey', () => {
  it('주간: 연도 경계를 넘어 이동한다', () => {
    expect(shiftPeriodKey('WEEKLY', '2026-W01', -1)).toBe('2025-W52');
    expect(shiftPeriodKey('WEEKLY', '2026-W53', 1)).toBe('2027-W01');
  });

  it('월간: 연도 경계를 넘어 이동한다', () => {
    expect(shiftPeriodKey('MONTHLY', '2026-01', -1)).toBe('2025-12');
    expect(shiftPeriodKey('MONTHLY', '2026-12', 1)).toBe('2027-01');
  });
});

describe('formatPeriodLabel', () => {
  it('월간은 "YYYY년 M월" 형태다', () => {
    expect(formatPeriodLabel('MONTHLY', '2026-08')).toBe('2026년 8월');
  });

  it('주간은 periodKey와 함께 시작~끝 날짜(MM/DD)를 보여준다', () => {
    expect(formatPeriodLabel('WEEKLY', '2026-W31')).toBe('2026-W31 (07/27~08/02)');
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx vitest run src/features/insight/rules/__tests__/period-key.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`view/src/features/insight/rules/period-key.ts`:

```ts
import { InsightPeriodType } from '../types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO 8601 주차: 그 날짜가 속한 주의 목요일이 속한 연도를 ISO 연도로 삼는다. */
function getIsoWeek(date: Date): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, isoWeek };
}

/** ISO 연도의 1/4일은 항상 그 연도 1주차에 속한다는 규칙으로 N주차의 월요일(UTC 00:00)을 구한다. */
function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return start;
}

function parseWeeklyKey(periodKey: string): { isoYear: number; isoWeek: number } {
  const [yearStr, weekStr] = periodKey.split('-W');
  return { isoYear: Number(yearStr), isoWeek: Number(weekStr) };
}

function parseMonthlyKey(periodKey: string): { year: number; month: number } {
  const [yearStr, monthStr] = periodKey.split('-');
  return { year: Number(yearStr), month: Number(monthStr) };
}

export function currentPeriodKey(periodType: InsightPeriodType, now = new Date()): string {
  if (periodType === 'WEEKLY') {
    const { isoYear, isoWeek } = getIsoWeek(now);
    return `${isoYear}-W${pad2(isoWeek)}`;
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

/** periodKey는 항상 zero-padded 고정폭 형식이라 문자열 비교로 미래 여부를 안전하게 판단할 수 있다. */
export function isFuturePeriodKey(
  periodType: InsightPeriodType,
  periodKey: string,
  now = new Date(),
): boolean {
  return periodKey > currentPeriodKey(periodType, now);
}

export function shiftPeriodKey(
  periodType: InsightPeriodType,
  periodKey: string,
  delta: number,
): string {
  if (periodType === 'MONTHLY') {
    const { year, month } = parseMonthlyKey(periodKey);
    const total = year * 12 + (month - 1) + delta;
    const nextYear = Math.floor(total / 12);
    const nextMonth = ((total % 12) + 12) % 12;
    return `${nextYear}-${pad2(nextMonth + 1)}`;
  }

  const { isoYear, isoWeek } = parseWeeklyKey(periodKey);
  const start = isoWeekMonday(isoYear, isoWeek);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  const next = getIsoWeek(start);
  return `${next.isoYear}-W${pad2(next.isoWeek)}`;
}

function formatMonthDay(date: Date): string {
  return `${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())}`;
}

export function formatPeriodLabel(periodType: InsightPeriodType, periodKey: string): string {
  if (periodType === 'MONTHLY') {
    const { year, month } = parseMonthlyKey(periodKey);
    return `${year}년 ${month}월`;
  }

  const { isoYear, isoWeek } = parseWeeklyKey(periodKey);
  const start = isoWeekMonday(isoYear, isoWeek);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${periodKey} (${formatMonthDay(start)}~${formatMonthDay(end)})`;
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx vitest run src/features/insight/rules/__tests__/period-key.test.ts`
Expected: PASS (전체 케이스)

- [ ] **Step 5: 커밋**

```bash
git add view/src/features/insight/rules/period-key.ts view/src/features/insight/rules/__tests__/period-key.test.ts
git commit -m "feat(view): 인사이트 기간(ISO 주차/캘린더월) 계산 순수 함수 추가"
```

---

### Task 13: `hooks/use-insights.ts` (얇은 React Query 래퍼)

기존 `use-devlogs.ts`와 동일하게, 분기 로직 없는 얇은 react-query 래퍼는 이 코드베이스 관례상 별도 단위 테스트를 두지 않는다 (네트워크 훅은 훅 자체가 아니라 이를 조합하는 controller/컴포넌트 레벨에서 검증 — Task 14/15 참고).

**Files:**
- Create: `view/src/features/insight/hooks/use-insights.ts`

**Interfaces:**
- Consumes: `insightApi` (Task 11)
- Produces: `useLatestInsightsQuery(options?)`, `useGenerateInsight()` — Task 14, Task 18(마이페이지)이 사용.

- [ ] **Step 1: 작성**

`view/src/features/insight/hooks/use-insights.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { insightApi } from '../api/insight-api';
import { InsightPeriodType } from '../types';

const insightKeys = {
  all: ['insights'] as const,
  latest: () => [...insightKeys.all, 'latest'] as const,
};

export function useLatestInsightsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: insightKeys.latest(),
    queryFn: () => insightApi.latest(),
    enabled: options?.enabled ?? true,
  });
}

export function useGenerateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodType, periodKey }: { periodType: InsightPeriodType; periodKey: string }) =>
      insightApi.generate(periodType, periodKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/hooks/use-insights.ts
git commit -m "feat(view): 인사이트 React Query 훅 추가"
```

---

### Task 14: `hooks/use-insight-controller.ts` (기간 선택 + 생성 뮤테이션 합성)

기간 토글/이동 상태와 `useGenerateInsight` 뮤테이션을 합쳐, `InsightModal`이 순수 props만으로 동작하게 하는 컨트롤러. `useAuthedDevLogController`와 같은 이유로(네트워크 뮤테이션 포함) 이 훅 자체는 단위 테스트하지 않는다 — 내부에서 쓰는 순수 로직은 Task 12에서, 이 훅이 만들어내는 렌더링 분기는 Task 15(`InsightModal` 테스트, props로 직접 검증)에서 커버한다.

**Files:**
- Create: `view/src/features/insight/hooks/use-insight-controller.ts`

**Interfaces:**
- Consumes: `currentPeriodKey`, `formatPeriodLabel`, `isFuturePeriodKey`, `shiftPeriodKey` (Task 12), `useGenerateInsight` (Task 13), `ApiError` (`@/lib/api-client`, Task 10), `Insight`/`InsightPeriodType` (Task 9)
- Produces: `InsightController` 타입, `useInsightController(): InsightController` — Task 15(`InsightModal`)와 Task 19(`page.tsx`)가 사용.

- [ ] **Step 1: 작성 (테스트는 Task 15의 `InsightModal` 테스트로 간접 커버)**

`view/src/features/insight/hooks/use-insight-controller.ts`:

```ts
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Insight, InsightPeriodType } from '../types';
import {
  currentPeriodKey,
  formatPeriodLabel,
  isFuturePeriodKey,
  shiftPeriodKey,
} from '../rules/period-key';
import { useGenerateInsight } from './use-insights';

export interface InsightController {
  periodType: InsightPeriodType;
  periodLabel: string;
  canGoNext: boolean;
  insight: Insight | undefined;
  isPending: boolean;
  isEmptyPeriod: boolean;
  isError: boolean;
  switchPeriodType: (periodType: InsightPeriodType) => void;
  shiftPeriod: (delta: number) => void;
  generate: () => void;
}

export function useInsightController(): InsightController {
  const [periodType, setPeriodType] = useState<InsightPeriodType>('WEEKLY');
  const [periodKey, setPeriodKey] = useState(() => currentPeriodKey('WEEKLY'));
  const generateInsight = useGenerateInsight();

  const switchPeriodType = (nextType: InsightPeriodType) => {
    setPeriodType(nextType);
    setPeriodKey(currentPeriodKey(nextType));
    generateInsight.reset();
  };

  const shiftPeriod = (delta: number) => {
    setPeriodKey((current) => shiftPeriodKey(periodType, current, delta));
    generateInsight.reset();
  };

  const nextPeriodKey = shiftPeriodKey(periodType, periodKey, 1);
  const isEmptyPeriodError =
    generateInsight.error instanceof ApiError && generateInsight.error.status === 422;

  return {
    periodType,
    periodLabel: formatPeriodLabel(periodType, periodKey),
    canGoNext: !isFuturePeriodKey(periodType, nextPeriodKey),
    insight: generateInsight.data,
    isPending: generateInsight.isPending,
    isEmptyPeriod: isEmptyPeriodError,
    isError: generateInsight.isError && !isEmptyPeriodError,
    switchPeriodType,
    shiftPeriod,
    generate: () => generateInsight.mutate({ periodType, periodKey }),
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/hooks/use-insight-controller.ts
git commit -m "feat(view): useInsightController 훅 추가"
```

---

### Task 15: `components/insight-modal.tsx` (프레젠테이션 전용)

`DevLogFormModal`과 동일하게, 데이터 패칭 없이 props(`InsightController` 형태)만으로 렌더링하는 순수 컴포넌트로 만든다 — 그래야 네트워크/모킹 없이 분기 렌더링을 테스트할 수 있다.

**Files:**
- Create: `view/src/features/insight/components/insight-modal.tsx`
- Test: `view/src/features/insight/components/__tests__/insight-modal.test.tsx`

**Interfaces:**
- Consumes: `InsightController` (Task 14 타입만 — 훅 자체는 호출하지 않음), `Button` (`@/components/button`)
- Produces: `InsightModal({ controller, onClose })` — Task 19(`page.tsx`)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`view/src/features/insight/components/__tests__/insight-modal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InsightController } from '../../hooks/use-insight-controller';
import { InsightModal } from '../insight-modal';

function buildController(overrides: Partial<InsightController> = {}): InsightController {
  return {
    periodType: 'WEEKLY',
    periodLabel: '2026-W31 (07/27~08/02)',
    canGoNext: true,
    insight: undefined,
    isPending: false,
    isEmptyPeriod: false,
    isError: false,
    switchPeriodType: vi.fn(),
    shiftPeriod: vi.fn(),
    generate: vi.fn(),
    ...overrides,
  };
}

describe('InsightModal', () => {
  it('canGoNext가 false면 다음 기간 버튼이 비활성화된다', () => {
    render(<InsightModal controller={buildController({ canGoNext: false })} onClose={() => {}} />);
    expect(screen.getByLabelText('다음 기간')).toBeDisabled();
  });

  it('canGoNext가 true면 다음 기간 버튼이 활성화된다', () => {
    render(<InsightModal controller={buildController({ canGoNext: true })} onClose={() => {}} />);
    expect(screen.getByLabelText('다음 기간')).toBeEnabled();
  });

  it('빈 기간(422) 상태면 안내 문구를 보여준다', () => {
    render(<InsightModal controller={buildController({ isEmptyPeriod: true })} onClose={() => {}} />);
    expect(screen.getByText('이 기간에 기록이 없습니다.')).toBeInTheDocument();
  });

  it('실패 상태면 재시도 안내 문구를 보여준다', () => {
    render(<InsightModal controller={buildController({ isError: true })} onClose={() => {}} />);
    expect(
      screen.getByText('인사이트 생성에 실패했어요, 다시 시도해주세요.'),
    ).toBeInTheDocument();
  });

  it('생성 결과가 있으면 요약/패턴/기록 수를 보여준다', () => {
    render(
      <InsightModal
        controller={buildController({
          insight: {
            id: '1',
            ownerId: 'owner',
            periodType: 'WEEKLY',
            periodKey: '2026-W31',
            summary: '이번 주 요약',
            patterns: ['반복 패턴 A'],
            logCount: 3,
            generatedAt: '2026-08-01T00:00:00.000Z',
          },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('이번 주 요약')).toBeInTheDocument();
    expect(screen.getByText('반복 패턴 A')).toBeInTheDocument();
    expect(screen.getByText('기록 3건')).toBeInTheDocument();
  });

  it('생성하기 버튼 클릭 시 controller.generate를 호출한다', async () => {
    const controller = buildController();
    render(<InsightModal controller={controller} onClose={() => {}} />);
    await userEvent.click(screen.getByText('[ 생성하기 ]'));
    expect(controller.generate).toHaveBeenCalledTimes(1);
  });

  it('주간/월간 토글 클릭 시 controller.switchPeriodType를 호출한다', async () => {
    const controller = buildController();
    render(<InsightModal controller={controller} onClose={() => {}} />);
    await userEvent.click(screen.getByText('월간'));
    expect(controller.switchPeriodType).toHaveBeenCalledWith('MONTHLY');
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx vitest run src/features/insight/components/__tests__/insight-modal.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`view/src/features/insight/components/insight-modal.tsx`:

```tsx
'use client';

import { InsightController } from '../hooks/use-insight-controller';
import { InsightPeriodType } from '../types';
import { Button } from '@/components/button';

interface InsightModalProps {
  controller: InsightController;
  onClose: () => void;
}

const PERIOD_TYPE_LABEL: Record<InsightPeriodType, string> = {
  WEEKLY: '주간',
  MONTHLY: '월간',
};

export function InsightModal({ controller, onClose }: InsightModalProps) {
  const {
    periodType,
    periodLabel,
    canGoNext,
    insight,
    isPending,
    isEmptyPeriod,
    isError,
    switchPeriodType,
    shiftPeriod,
    generate,
  } = controller;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-black/70 sm:p-4">
      <div className="flex h-full flex-col overflow-y-auto border-line bg-panel p-5 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:border">
        <p className="text-sm text-dim">$ devlog insight</p>

        <div className="mt-4 flex gap-2">
          {(Object.keys(PERIOD_TYPE_LABEL) as InsightPeriodType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchPeriodType(type)}
              className={`min-h-11 border px-3 text-sm ${
                periodType === type
                  ? 'border-signal text-signal'
                  : 'border-line text-dim hover:text-text'
              }`}
            >
              {PERIOD_TYPE_LABEL[type]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            aria-label="이전 기간"
            className="text-dim hover:text-signal"
          >
            ‹
          </button>
          <span className="text-text">{periodLabel}</span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            disabled={!canGoNext}
            aria-label="다음 기간"
            className="text-dim hover:text-signal disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mt-4 flex-1">
          {isPending && <p className="text-sm text-dim">AI가 회고를 작성하는 중...</p>}
          {isEmptyPeriod && <p className="text-sm text-dim">이 기간에 기록이 없습니다.</p>}
          {isError && (
            <p className="text-sm text-danger">인사이트 생성에 실패했어요, 다시 시도해주세요.</p>
          )}
          {insight && (
            <div className="space-y-3 text-sm">
              <p className="text-text">{insight.summary}</p>
              {insight.patterns.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-dim">
                  {insight.patterns.map((pattern) => (
                    <li key={pattern}>{pattern}</li>
                  ))}
                </ul>
              )}
              <p className="text-dim">기록 {insight.logCount}건</p>
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            [ 닫기 ]
          </Button>
          <Button variant="signal" onClick={generate} disabled={isPending}>
            {isPending ? '[ 생성 중... ]' : '[ 생성하기 ]'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npx vitest run src/features/insight/components/__tests__/insight-modal.test.tsx`
Expected: PASS (7개 케이스)

- [ ] **Step 5: 커밋**

```bash
git add view/src/features/insight/components/insight-modal.tsx view/src/features/insight/components/__tests__/insight-modal.test.tsx
git commit -m "feat(view): InsightModal 컴포넌트 추가"
```

---

### Task 16: `components/insight-entry-button.tsx`

헤더 스트릭 배지 근처에 붙는 진입점 아이콘. `search-bar.tsx`/`tag-chips.tsx`와 동일하게 단순 프레젠테이션이라 별도 테스트는 두지 않는다 (기존 관례).

**Files:**
- Create: `view/src/features/insight/components/insight-entry-button.tsx`

**Interfaces:**
- Produces: `InsightEntryButton({ onClick })` — Task 19(`page.tsx`)가 사용.

- [ ] **Step 1: 작성**

`view/src/features/insight/components/insight-entry-button.tsx`:

```tsx
interface InsightEntryButtonProps {
  onClick: () => void;
}

export function InsightEntryButton({ onClick }: InsightEntryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="AI 회고 인사이트 보기"
      className="text-lg text-dim hover:text-signal"
    >
      ✦
    </button>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/components/insight-entry-button.tsx
git commit -m "feat(view): InsightEntryButton 컴포넌트 추가"
```

---

### Task 17: `components/insight-history-card.tsx`

마이페이지 "인사이트 기록" 섹션에서 주간/월간 각각에 쓰는 카드. 단순 프레젠테이션이라 별도 테스트는 두지 않는다 (Task 16과 동일한 이유).

**Files:**
- Create: `view/src/features/insight/components/insight-history-card.tsx`

**Interfaces:**
- Consumes: `Insight` (Task 9), `formatPeriodLabel` (Task 12)
- Produces: `InsightHistoryCard({ label, insight })` — Task 20(마이페이지)이 사용.

- [ ] **Step 1: 작성**

`view/src/features/insight/components/insight-history-card.tsx`:

```tsx
import { Insight } from '../types';
import { formatPeriodLabel } from '../rules/period-key';

interface InsightHistoryCardProps {
  label: string;
  insight: Insight | null | undefined;
}

export function InsightHistoryCard({ label, insight }: InsightHistoryCardProps) {
  return (
    <div>
      <p className="text-sm text-dim">$ devlog insight --{label}</p>
      {insight ? (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-dim">{formatPeriodLabel(insight.periodType, insight.periodKey)}</p>
          <p className="text-text">{insight.summary}</p>
          {insight.patterns.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-dim">
              {insight.patterns.map((pattern) => (
                <li key={pattern}>{pattern}</li>
              ))}
            </ul>
          )}
          <p className="text-dim">기록 {insight.logCount}건</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-dim">아직 생성한 인사이트가 없습니다.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/components/insight-history-card.tsx
git commit -m "feat(view): InsightHistoryCard 컴포넌트 추가"
```

---

### Task 18: `features/insight/index.ts` 배럴 (공개 API)

**Files:**
- Create: `view/src/features/insight/index.ts`

**Interfaces:**
- Produces: `features/insight`가 외부(app/)에 노출하는 전체 표면 — Task 19, 20이 이 경로로만 import.

- [ ] **Step 1: 작성**

`view/src/features/insight/index.ts`:

```ts
export { InsightEntryButton } from './components/insight-entry-button';
export { InsightModal } from './components/insight-modal';
export { InsightHistoryCard } from './components/insight-history-card';
export { useInsightController } from './hooks/use-insight-controller';
export { useLatestInsightsQuery } from './hooks/use-insights';
export type { Insight, InsightPeriodType, LatestInsights } from './types';
```

- [ ] **Step 2: 커밋**

```bash
git add view/src/features/insight/index.ts
git commit -m "feat(view): insight 배럴(index.ts) 추가"
```

---

### Task 19: `app/page.tsx` 통합 — 헤더 진입점 + 모달 (게스트 미노출)

**Files:**
- Modify: `view/src/app/page.tsx`

**Interfaces:**
- Consumes: `InsightEntryButton`, `InsightModal`, `useInsightController` (Task 18)

- [ ] **Step 1: `page.tsx`에 인사이트 진입점/모달 추가**

`view/src/app/page.tsx`의 import 블록에 추가:

```tsx
import {
  InsightEntryButton,
  InsightModal,
  useInsightController,
} from '@/features/insight';
```

컴포넌트 본문 최상단(다른 훅들과 함께)에 추가:

```tsx
const insightController = useInsightController();
const [isInsightOpen, setIsInsightOpen] = useState(false);
```

헤더의 스트릭 아이콘 바로 뒤(`{controller.streakIcon && (...)}` 다음)에 추가:

```tsx
{isAuthed && (
  <InsightEntryButton onClick={() => setIsInsightOpen(true)} />
)}
```

`DevLogFormModal` 렌더링 블록 뒤(같은 레벨)에 추가:

```tsx
{isInsightOpen && (
  <InsightModal controller={insightController} onClose={() => setIsInsightOpen(false)} />
)}
```

전체 헤더 블록은 다음과 같은 모양이 된다 (기존 코드에 추가되는 부분만 발췌, 나머지 구조는 그대로 유지):

```tsx
<div className="flex items-center gap-2">
  <Logo className="h-6 w-6" />
  <h1 className="text-xl font-bold text-text">3m-devlog</h1>
  {controller.streakIcon && (
    <span aria-label="연속 기록" className="text-lg">
      {controller.streakIcon}
    </span>
  )}
  {isAuthed && <InsightEntryButton onClick={() => setIsInsightOpen(true)} />}
</div>
```

- [ ] **Step 2: 클라이언트 전체 테스트/타입체크 통과 확인**

Run:
```bash
cd view
source $(brew --prefix nvm)/nvm.sh && nvm use default
npm test
npx tsc --noEmit
```
Expected: 테스트/타입체크 모두 통과.

- [ ] **Step 3: 개발 서버로 육안 확인**

Run: `cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npm run dev` (서버는 별도 터미널에서 `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && PORT=3001 npm run start:dev`로 함께 기동)
Expected: 브라우저에서 게스트 모드에는 진입점 아이콘이 안 보이고, 로그인 상태에서는 스트릭 배지 옆에 아이콘이 보이며 클릭 시 모달이 열림. (실제 생성 동작 확인은 Task 22에서 진행.)

- [ ] **Step 4: 커밋**

```bash
git add view/src/app/page.tsx
git commit -m "feat(view): 메인 화면에 인사이트 진입점/모달 연결"
```

---

### Task 20: `app/mypage/page.tsx` 통합 — "인사이트 기록" 섹션

**Files:**
- Modify: `view/src/app/mypage/page.tsx`

**Interfaces:**
- Consumes: `InsightHistoryCard`, `useLatestInsightsQuery` (Task 18)

- [ ] **Step 1: import 추가**

```tsx
import { InsightHistoryCard, useLatestInsightsQuery } from '@/features/insight';
```

- [ ] **Step 2: 쿼리 훅 추가 (기존 `statsQuery` 옆)**

```tsx
const latestInsightsQuery = useLatestInsightsQuery({ enabled: !!meQuery.data });
```

- [ ] **Step 3: "$ devlog stats" 섹션과 로그아웃/회원탈퇴 버튼 사이에 섹션 추가**

```tsx
<div>
  <p className="text-sm text-dim">$ devlog insight --history</p>
  {latestInsightsQuery.isLoading ? (
    <p className="mt-2 text-sm text-dim">loading...</p>
  ) : (
    <div className="mt-2 space-y-4">
      <InsightHistoryCard label="weekly" insight={latestInsightsQuery.data?.weekly} />
      <InsightHistoryCard label="monthly" insight={latestInsightsQuery.data?.monthly} />
    </div>
  )}
</div>
```

- [ ] **Step 4: 클라이언트 전체 테스트/타입체크 통과 확인**

Run:
```bash
cd view
source $(brew --prefix nvm)/nvm.sh && nvm use default
npm test
npx tsc --noEmit
```
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add view/src/app/mypage/page.tsx
git commit -m "feat(view): 마이페이지에 인사이트 기록 섹션 추가"
```

---

## Part C — 마무리

### Task 21: 서버/클라이언트 전체 검증

**Files:** (변경 없음, 검증만)

- [ ] **Step 1: 서버 유닛+e2e 전체 실행**

Run:
```bash
cd server
docker compose up -d
source $(brew --prefix nvm)/nvm.sh && nvm use default
make test-all
```
Expected: 유닛/e2e 전체 PASS (기존 케이스 포함, 회귀 없음).

- [ ] **Step 2: 서버 빌드 확인**

Run: `cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && npm run build`
Expected: 에러 없이 `dist/` 생성.

- [ ] **Step 3: 클라이언트 전체 검증**

Run:
```bash
cd view
source $(brew --prefix nvm)/nvm.sh && nvm use default
npm test
npx tsc --noEmit
npm run lint
npm run build
```
Expected: 전부 통과.

- [ ] **Step 4: 실패한 항목이 있으면 원인 수정 후 재실행 (통과할 때까지 반복, 이 태스크에서는 커밋하지 않음 — 문제 발견 시 해당 태스크로 돌아가 고친 뒤 그 태스크 커밋을 새로 남긴다)**

---

### Task 22: 수동 브라우저 확인 (실제 claude CLI 서브프로세스까지)

**Files:** (변경 없음, 수동 확인만)

- [ ] **Step 1: 서버/클라이언트 동시 기동**

Run (각각 별도 터미널/백그라운드):
```bash
cd server && source $(brew --prefix nvm)/nvm.sh && nvm use default && PORT=3001 npm run start:dev
cd view && source $(brew --prefix nvm)/nvm.sh && nvm use default && npm run dev
```

- [ ] **Step 2: 실제 로그인 세션으로 확인**

- 로그인 후 이번 주에 로그가 1건 이상 있는 상태를 만든다 (없으면 새 로그 하나 작성).
- 헤더의 인사이트 아이콘 클릭 → 모달에서 "생성하기" 클릭.
- 실제 `claude` CLI 서브프로세스 호출이라 수 초~수십 초 걸릴 수 있음 — 로딩 문구가 보이는지, 이후 요약/패턴/기록 수가 정상적으로 표시되는지 확인.
- 로그가 없는 과거 기간으로 이동해 "생성하기" → "이 기간에 기록이 없습니다" 문구 확인.
- 다음 기간 화살표가 현재 주/월에서 비활성화되는지 확인.
- 마이페이지로 이동 → "인사이트 기록" 섹션에 방금 생성한 결과가 보이는지 확인.
- 같은 기간으로 다시 "생성하기" → 서버 로그/DB에서 `Insight` row가 덮어써지고 늘어나지 않는지 확인 (`psql`이나 Prisma Studio로 `insight` 테이블 확인 가능: `cd server && npx prisma studio`).

- [ ] **Step 3: 문제 발견 시 해당 태스크로 돌아가 수정 (이 태스크 자체는 커밋 없음)**

---

### Task 23: 문서 갱신 (tasks/ 체크리스트 + CLAUDE.md 회고)

프로젝트 워크플로우(`CLAUDE.md` "새 요구사항 처리 절차")의 4~6단계: 작업 분해 체크리스트 추가/완료 표시, 세션에서 배운 것 회고 반영.

**Files:**
- Modify: `tasks/2026-W31.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: `tasks/2026-W31.md`에 이번 요구사항 섹션 추가 (완료 처리 포함)**

기존 파일 맨 끝에 아래 섹션 추가 (형식은 기존 섹션들과 동일하게, 완료된 항목은 실제 구현/검증 후 `[x]`로):

```markdown
## 2026-08-01 ([3m-log 요구사항_20260801.md](../requirements/2026-W31/3m-log%20요구사항_20260801.md))

### 1. AI 회고 요약 & 성장 인사이트
- [x] 헤더 스트릭 배지 근처에 인사이트 진입점 아이콘 추가 (게스트 모드 미노출)
- [x] 모달에서 주간/월간 토글 + 과거 기간 이동(미래 불가) — `InsightModal`, `rules/period-key.ts`
- [x] 요청 시점에 생성, 문장형 요약 + 반복 패턴 + 활동 수치(로그 수) 반환 — `POST /insights/generate`
- [x] 같은 기간 재요청 시 덮어씀(기간당 최신 1건) — `Insight` 유니크 제약 + upsert
- [x] 로그 0건 기간은 AI 호출 없이 안내만 표시 — 서버 422, 프론트 안내 문구
- [x] 마이페이지 "인사이트 기록" 영역 — 주간/월간 최신 결과 카드로 표시, `GET /insights/latest`
- [x] AI 연동은 실제 API 키 없이 로컬 `claude` CLI 서브프로세스로 우회 구현 (`ClaudeCliInsightGenerator`, 포트로 분리해 추후 교체 가능)

### 검증
- [x] 서버 유닛/e2e, 클라이언트 vitest/tsc/eslint/next build 통과
- [x] 실제 로그인 세션으로 브라우저 확인 (생성/빈 기간/미래 기간 차단/마이페이지 기록/재요청 덮어쓰기)
```

- [ ] **Step 2: `CLAUDE.md`에 이번 세션에서 배운 것 반영**

`CLAUDE.md`의 "재발 가능성 높은 함정:" 목록 끝에 아래 항목 추가 (실제 구현 중 막혔던 부분이 있었다면 그것으로 교체/추가):

```markdown
- Claude Code CLI를 서브프로세스로 호출할 때 `--output-format json --json-schema '<스키마>'`를 같이 주면 최상위 응답에 `structured_output` 필드로 스키마에 맞게 이미 파싱된 객체가 온다 (`result`는 같은 내용의 문자열이라 이중 파싱 불필요). `is_error` 필드로 실패 여부 확인. `--disallowedTools`로 불필요한 도구(Bash/Read/Write/...)를 막아도 정상 동작.
```

- [ ] **Step 3: 커밋**

```bash
git add tasks/2026-W31.md CLAUDE.md
git commit -m "docs: AI 인사이트 요구사항 체크리스트 완료 처리 + 회고 반영"
```
