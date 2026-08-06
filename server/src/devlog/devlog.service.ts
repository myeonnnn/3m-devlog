import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevLogDto } from './dto/create-devlog.dto';
import { UpdateDevLogDto } from './dto/update-devlog.dto';
import {
  DevLogPeriod,
  FindDevLogsQueryDto,
} from './dto/find-devlogs-query.dto';

function normalizeTag(raw: string) {
  const displayName = raw.trim().replace(/^#/, '');
  return { displayName, normalized: displayName.toLowerCase() };
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function diffInDays(a: string, b: string): number {
  const ms = parseDateOnly(a).getTime() - parseDateOnly(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function subtractOneDay(dateOnly: string): string {
  const date = parseDateOnly(dateOnly);
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateOnly(date);
}

/** 정책: 로그 날짜는 오늘부터 과거 최대 1개월까지만 허용, 미래 날짜 불가. */
function assertLogDateInRange(logDate: string) {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const max = toDateOnly(today);
  const min = toDateOnly(oneMonthAgo);

  if (logDate < min || logDate > max) {
    throw new BadRequestException(
      '로그 날짜는 오늘부터 과거 최대 1개월 이내여야 해요.',
    );
  }
}

/** 정책: "최근 N일"은 오늘을 포함해 N일 — recent7은 오늘-6일, recent30은 오늘-29일부터. */
function resolvePeriodStart(period?: DevLogPeriod): Date | undefined {
  if (period === 'recent7') return daysAgo(6);
  if (period === 'recent30') return daysAgo(29);
  return undefined;
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

const devLogInclude = {
  tags: { include: { tag: true } },
} as const;

type DevLogWithTags = Prisma.DevLogGetPayload<{
  include: typeof devLogInclude;
}>;

function toDto(devLog: DevLogWithTags) {
  const { tags, ...rest } = devLog;
  return { ...rest, tags: tags.map((t) => t.tag.displayName) };
}

@Injectable()
export class DevLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateDevLogDto) {
    assertLogDateInRange(dto.logDate);
    const tagIds = await this.upsertTags(dto.tags ?? []);

    const devLog = await this.prisma.devLog.create({
      data: {
        ownerId,
        logDate: new Date(dto.logDate),
        learnedNote: dto.learnedNote,
        troubleshootingNote: dto.troubleshootingNote,
        tomorrowTask: dto.tomorrowTask,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: devLogInclude,
    });

    return toDto(devLog);
  }

  async findAll(ownerId: string, query: FindDevLogsQueryDto) {
    const periodStart = resolvePeriodStart(query.period);
    const limit = query.limit ?? 20;

    const devLogs = await this.prisma.devLog.findMany({
      where: {
        ownerId,
        ...(periodStart && { logDate: { gte: periodStart } }),
        ...(query.tag && {
          tags: {
            some: { tag: { normalized: query.tag.trim().toLowerCase() } },
          },
        }),
        ...(query.search && {
          OR: [
            { learnedNote: { contains: query.search, mode: 'insensitive' } },
            {
              troubleshootingNote: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            { tomorrowTask: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: devLogInclude,
      orderBy: [{ logDate: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });

    const hasMore = devLogs.length > limit;
    const items = hasMore ? devLogs.slice(0, limit) : devLogs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map((devLog) => toDto(devLog)),
      nextCursor,
    };
  }

  async streak(ownerId: string): Promise<{ days: number }> {
    const logs = await this.prisma.devLog.findMany({
      where: { ownerId },
      select: { logDate: true },
      distinct: ['logDate'],
      orderBy: { logDate: 'desc' },
    });

    const dates = [...new Set(logs.map((log) => toDateOnly(log.logDate)))];
    if (dates.length === 0) {
      return { days: 0 };
    }

    const today = toDateOnly(new Date());
    if (diffInDays(today, dates[0]) > 1) {
      return { days: 0 };
    }

    let days = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] !== subtractOneDay(dates[i - 1])) {
        break;
      }
      days++;
    }
    return { days };
  }

  async findOne(ownerId: string, id: string) {
    const devLog = await this.findOwnedOrThrow(ownerId, id);
    return toDto(devLog);
  }

  async update(ownerId: string, id: string, dto: UpdateDevLogDto) {
    await this.findOwnedOrThrow(ownerId, id);
    if (dto.logDate) {
      assertLogDateInRange(dto.logDate);
    }

    const tagIds = dto.tags ? await this.upsertTags(dto.tags) : undefined;

    const devLog = await this.prisma.devLog.update({
      where: { id },
      data: {
        ...(dto.logDate && { logDate: new Date(dto.logDate) }),
        ...(dto.learnedNote && { learnedNote: dto.learnedNote }),
        ...(dto.troubleshootingNote !== undefined && {
          troubleshootingNote: dto.troubleshootingNote,
        }),
        ...(dto.tomorrowTask !== undefined && {
          tomorrowTask: dto.tomorrowTask,
        }),
        ...(tagIds && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: devLogInclude,
    });

    return toDto(devLog);
  }

  async remove(ownerId: string, id: string) {
    await this.findOwnedOrThrow(ownerId, id);
    await this.prisma.devLog.delete({ where: { id } });
  }

  async popularTags(ownerId: string, limit = 10) {
    const grouped = await this.prisma.devLogTag.groupBy({
      by: ['tagId'],
      where: { devLog: { ownerId } },
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: limit,
    });

    const tags = await this.prisma.tag.findMany({
      where: { id: { in: grouped.map((g) => g.tagId) } },
    });
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));

    return grouped.map((g) => ({
      tag: tagById.get(g.tagId)?.displayName,
      count: g._count.tagId,
    }));
  }

  async stats(ownerId: string) {
    const [totalCount, topTags] = await Promise.all([
      this.prisma.devLog.count({ where: { ownerId } }),
      this.popularTags(ownerId, 5),
    ]);

    return { totalCount, topTags };
  }

  private async findOwnedOrThrow(ownerId: string, id: string) {
    const devLog = await this.prisma.devLog.findUnique({
      where: { id },
      include: devLogInclude,
    });
    if (!devLog) {
      throw new NotFoundException('DevLog not found');
    }
    if (devLog.ownerId !== ownerId) {
      throw new ForbiddenException('Not the owner of this DevLog');
    }
    return devLog;
  }

  /** 태그명을 정규화해 Tag 테이블에 upsert하고 id 목록을 반환한다. displayName은 최초 입력값을 유지한다. */
  private async upsertTags(rawTags: string[]): Promise<string[]> {
    const uniqueByNormalized = new Map<
      string,
      { displayName: string; normalized: string }
    >();
    for (const raw of rawTags) {
      const tag = normalizeTag(raw);
      if (!uniqueByNormalized.has(tag.normalized)) {
        uniqueByNormalized.set(tag.normalized, tag);
      }
    }

    const tags = await Promise.all(
      [...uniqueByNormalized.values()].map(({ displayName, normalized }) =>
        this.prisma.tag.upsert({
          where: { normalized },
          create: { displayName, normalized },
          update: {},
        }),
      ),
    );

    return tags.map((tag) => tag.id);
  }
}
