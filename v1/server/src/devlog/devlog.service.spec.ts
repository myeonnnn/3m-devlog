import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DevLogService } from './devlog.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  devLog: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
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
        logDate: '2026-07-24',
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
        logDate: '2026-07-24',
        learnedNote: '오늘 배운 것',
      });

      expect(prisma.tag.upsert).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
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
});
