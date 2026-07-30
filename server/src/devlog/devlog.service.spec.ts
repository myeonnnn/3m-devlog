import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DevLogService } from './devlog.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  devLog: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  tag: {
    upsert: jest.Mock;
    findMany: jest.Mock;
  };
  devLogTag: {
    groupBy: jest.Mock;
  };
};

function createPrismaMock(): MockPrisma {
  return {
    devLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tag: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    devLogTag: {
      groupBy: jest.fn(),
    },
  };
}

describe('DevLogService', () => {
  let service: DevLogService;
  let prisma: MockPrisma;

  const ownerId = 'owner-1';
  const devLogId = 'devlog-1';
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DevLogService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('태그를 대소문자 무관하게 중복 제거하고, 최초 입력값을 displayName으로 유지한다', async () => {
      prisma.tag.upsert.mockImplementation(
        (args: { where: { normalized: string } }) => {
          const normalized = args.where.normalized;
          const displayName: string = { react: 'React', nest: 'Nest' }[
            normalized
          ] as string;
          return Promise.resolve({
            id: `tag-${normalized}`,
            normalized,
            displayName,
          });
        },
      );
      prisma.devLog.create.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [
          { tag: { displayName: 'React' } },
          { tag: { displayName: 'Nest' } },
        ],
      });

      await service.create(ownerId, {
        logDate: today,
        learnedNote: '오늘 배운 것',
        tags: ['React', 'react', '  #Nest  '],
      });

      // "React"가 먼저 들어왔으므로 upsert에는 "React"가 displayName으로 전달되어야 한다
      expect(prisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { normalized: 'react' },
          create: { displayName: 'React', normalized: 'react' },
        }),
      );
      // react(중복)는 별도로 upsert되지 않는다 (react/Nest 2건만 호출)
      expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
    });

    it('tags가 없으면 태그 upsert 없이 devLog만 생성한다', async () => {
      prisma.devLog.create.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [],
      });

      const result = await service.create(ownerId, {
        logDate: today,
        learnedNote: '오늘 배운 것',
      });

      expect(prisma.tag.upsert).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
    });

    it('미래 날짜로는 생성할 수 없다', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        service.create(ownerId, {
          logDate: tomorrow.toISOString().slice(0, 10),
          learnedNote: '오늘 배운 것',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.devLog.create).not.toHaveBeenCalled();
    });

    it('과거 1개월을 넘는 날짜로는 생성할 수 없다', async () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      await expect(
        service.create(ownerId, {
          logDate: twoMonthsAgo.toISOString().slice(0, 10),
          learnedNote: '오늘 배운 것',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.devLog.create).not.toHaveBeenCalled();
    });
  });

  describe('소유권 검증', () => {
    it('존재하지 않는 DevLog를 조회하면 NotFoundException을 던진다', async () => {
      prisma.devLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ownerId, devLogId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('다른 사용자의 DevLog를 조회하면 ForbiddenException을 던진다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId: 'someone-else',
        tags: [],
      });

      await expect(service.findOne(ownerId, devLogId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('소유자가 맞으면 정상적으로 조회된다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId,
        learnedNote: '오늘 배운 것',
        tags: [],
      });

      const result = await service.findOne(ownerId, devLogId);

      expect(result.id).toBe(devLogId);
    });

    it('소유자가 아니면 삭제할 수 없다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId: 'someone-else',
        tags: [],
      });

      await expect(service.remove(ownerId, devLogId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.devLog.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('tags를 전달하면 기존 태그 관계를 지우고 새로 만든다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [],
      });
      prisma.tag.upsert.mockResolvedValue({
        id: 'tag-typescript',
        normalized: 'typescript',
        displayName: 'typescript',
      });
      prisma.devLog.update.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [{ tag: { displayName: 'typescript' } }],
      });

      await service.update(ownerId, devLogId, { tags: ['typescript'] });

      expect(prisma.devLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: devLogId },
          data: expect.objectContaining({
            tags: {
              deleteMany: {},
              create: [{ tagId: 'tag-typescript' }],
            },
          }),
        }),
      );
    });

    it('tags를 전달하지 않으면 태그 관계를 건드리지 않는다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [],
      });
      prisma.devLog.update.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [],
      });

      await service.update(ownerId, devLogId, { learnedNote: '수정된 내용' });

      expect(prisma.tag.upsert).not.toHaveBeenCalled();
      const callArgs = prisma.devLog.update.mock.calls[0][0] as {
        data: { tags?: unknown };
      };
      expect(callArgs.data.tags).toBeUndefined();
    });

    it('logDate를 범위 밖 날짜로 수정할 수 없다', async () => {
      prisma.devLog.findUnique.mockResolvedValue({
        id: devLogId,
        ownerId,
        tags: [],
      });
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        service.update(ownerId, devLogId, {
          logDate: tomorrow.toISOString().slice(0, 10),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.devLog.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    function daysAgo(n: number) {
      const date = new Date();
      date.setDate(date.getDate() - n);
      return date.toISOString().slice(0, 10);
    }

    beforeEach(() => {
      prisma.devLog.findMany.mockResolvedValue([]);
    });

    it('period가 없으면 logDate 조건 없이 조회한다', async () => {
      await service.findAll(ownerId, {});

      const where = (
        prisma.devLog.findMany.mock.calls[0][0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where.logDate).toBeUndefined();
    });

    it("period가 'recent7'이면 오늘 포함 최근 7일(오늘 - 6일 이상)만 조회한다", async () => {
      await service.findAll(ownerId, { period: 'recent7' });

      const where = (
        prisma.devLog.findMany.mock.calls[0][0] as {
          where: { logDate: { gte: Date } };
        }
      ).where;
      expect(where.logDate.gte.toISOString().slice(0, 10)).toBe(daysAgo(6));
    });

    it("period가 'recent30'이면 오늘 포함 최근 30일(오늘 - 29일 이상)만 조회한다", async () => {
      await service.findAll(ownerId, { period: 'recent30' });

      const where = (
        prisma.devLog.findMany.mock.calls[0][0] as {
          where: { logDate: { gte: Date } };
        }
      ).where;
      expect(where.logDate.gte.toISOString().slice(0, 10)).toBe(daysAgo(29));
    });

    it("period가 'all'이면 logDate 조건 없이 조회한다", async () => {
      await service.findAll(ownerId, { period: 'all' });

      const where = (
        prisma.devLog.findMany.mock.calls[0][0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where.logDate).toBeUndefined();
    });

    it('기간 필터는 태그/키워드 검색과 교집합으로 함께 적용된다', async () => {
      await service.findAll(ownerId, {
        period: 'recent7',
        tag: 'react',
        search: '버그',
      });

      const where = (
        prisma.devLog.findMany.mock.calls[0][0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where.logDate).toBeDefined();
      expect(where.tags).toBeDefined();
      expect(where.OR).toBeDefined();
    });

    describe('페이지네이션', () => {
      function makeDevLog(id: string) {
        return { id, ownerId, logDate: new Date(), tags: [] };
      }

      it('limit을 지정하지 않으면 기본 20건 기준으로 조회한다', async () => {
        await service.findAll(ownerId, {});

        const args = prisma.devLog.findMany.mock.calls[0][0] as {
          take: number;
        };
        expect(args.take).toBe(21);
      });

      it('조회된 항목이 limit보다 많으면(다음 페이지 있음) nextCursor에 마지막 항목의 id가 담긴다', async () => {
        const logs = Array.from({ length: 21 }, (_, i) =>
          makeDevLog(`id-${i}`),
        );
        prisma.devLog.findMany.mockResolvedValue(logs);

        const result = await service.findAll(ownerId, {});

        expect(result.items).toHaveLength(20);
        expect(result.nextCursor).toBe('id-19');
      });

      it('조회된 항목이 limit 이하이면 nextCursor는 null이다', async () => {
        const logs = Array.from({ length: 5 }, (_, i) => makeDevLog(`id-${i}`));
        prisma.devLog.findMany.mockResolvedValue(logs);

        const result = await service.findAll(ownerId, { limit: 10 });

        expect(result.items).toHaveLength(5);
        expect(result.nextCursor).toBeNull();
      });

      it('cursor를 전달하면 해당 id 다음부터 조회한다', async () => {
        await service.findAll(ownerId, { cursor: 'id-19' });

        const args = prisma.devLog.findMany.mock.calls[0][0] as {
          cursor?: { id: string };
          skip?: number;
        };
        expect(args.cursor).toEqual({ id: 'id-19' });
        expect(args.skip).toBe(1);
      });

      it('응답의 items는 기존과 동일하게 태그가 displayName 배열로 변환되어 있다', async () => {
        prisma.devLog.findMany.mockResolvedValue([
          {
            id: 'id-1',
            ownerId,
            logDate: new Date(),
            tags: [{ tag: { displayName: 'React' } }],
          },
        ]);

        const result = await service.findAll(ownerId, {});

        expect(result.items[0].tags).toEqual(['React']);
      });
    });
  });

  describe('streak', () => {
    function dateNDaysAgo(n: number): Date {
      const date = new Date();
      date.setDate(date.getDate() - n);
      return new Date(date.toISOString().slice(0, 10));
    }

    it('로그가 하나도 없으면 0을 반환한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([]);

      const result = await service.streak(ownerId);

      expect(result).toEqual({ days: 0 });
    });

    it('오늘 포함 3일 연속 기록이 있으면 3을 반환한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([
        { logDate: dateNDaysAgo(0) },
        { logDate: dateNDaysAgo(1) },
        { logDate: dateNDaysAgo(2) },
      ]);

      const result = await service.streak(ownerId);

      expect(result).toEqual({ days: 3 });
    });

    it('어제까지 3일 연속 기록이 있고 오늘 아직 기록이 없어도 3을 유지한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([
        { logDate: dateNDaysAgo(1) },
        { logDate: dateNDaysAgo(2) },
        { logDate: dateNDaysAgo(3) },
      ]);

      const result = await service.streak(ownerId);

      expect(result).toEqual({ days: 3 });
    });

    it('마지막 기록이 그제(오늘로부터 2일 전)이고 그 이후 기록이 없으면 0을 반환한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([{ logDate: dateNDaysAgo(2) }]);

      const result = await service.streak(ownerId);

      expect(result).toEqual({ days: 0 });
    });

    it('오늘 로그 하나만 있으면 1을 반환한다', async () => {
      prisma.devLog.findMany.mockResolvedValue([{ logDate: dateNDaysAgo(0) }]);

      const result = await service.streak(ownerId);

      expect(result).toEqual({ days: 1 });
    });
  });

  describe('popularTags', () => {
    it('태그별 집계 개수와 함께 displayName을 반환한다', async () => {
      prisma.devLogTag.groupBy.mockResolvedValue([
        { tagId: 'tag-react', _count: { tagId: 2 } },
        { tagId: 'tag-nest', _count: { tagId: 1 } },
      ]);
      prisma.tag.findMany.mockResolvedValue([
        { id: 'tag-react', displayName: 'React', normalized: 'react' },
        { id: 'tag-nest', displayName: 'Nest', normalized: 'nest' },
      ]);

      const result = await service.popularTags(ownerId);

      expect(result).toEqual([
        { tag: 'React', count: 2 },
        { tag: 'Nest', count: 1 },
      ]);
    });
  });

  describe('stats', () => {
    it('총 로그 개수와 인기 태그를 함께 반환한다', async () => {
      prisma.devLog.count.mockResolvedValue(7);
      prisma.devLogTag.groupBy.mockResolvedValue([
        { tagId: 'tag-react', _count: { tagId: 3 } },
      ]);
      prisma.tag.findMany.mockResolvedValue([
        { id: 'tag-react', displayName: 'React', normalized: 'react' },
      ]);

      const result = await service.stats(ownerId);

      expect(prisma.devLog.count).toHaveBeenCalledWith({ where: { ownerId } });
      expect(result).toEqual({
        totalCount: 7,
        topTags: [{ tag: 'React', count: 3 }],
      });
    });
  });
});
