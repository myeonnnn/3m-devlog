import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevLogDto } from './dto/create-devlog.dto';
import { UpdateDevLogDto } from './dto/update-devlog.dto';
import { FindDevLogsQueryDto } from './dto/find-devlogs-query.dto';

function normalizeTag(raw: string) {
  const displayName = raw.trim().replace(/^#/, '');
  return { displayName, normalized: displayName.toLowerCase() };
}

const devLogInclude = {
  tags: { include: { tag: true } },
} as const;

@Injectable()
export class DevLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateDevLogDto) {
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

    return this.toDto(devLog);
  }

  async findAll(ownerId: string, query: FindDevLogsQueryDto) {
    const devLogs = await this.prisma.devLog.findMany({
      where: {
        ownerId,
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
      orderBy: { logDate: 'desc' },
    });

    return devLogs.map((devLog) => this.toDto(devLog));
  }

  async findOne(ownerId: string, id: string) {
    const devLog = await this.findOwnedOrThrow(ownerId, id);
    return this.toDto(devLog);
  }

  async update(ownerId: string, id: string, dto: UpdateDevLogDto) {
    await this.findOwnedOrThrow(ownerId, id);

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

    return this.toDto(devLog);
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

  private toDto(
    devLog: { tags: { tag: { displayName: string } }[] } & Record<
      string,
      unknown
    >,
  ) {
    const { tags, ...rest } = devLog;
    return { ...rest, tags: tags.map((t) => t.tag.displayName) };
  }
}
