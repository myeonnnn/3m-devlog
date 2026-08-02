import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';
import { InsightService } from './insight.service';
import { PrismaService } from '../prisma/prisma.service';
import { InsightGenerator } from './insight-generator.port';

type MockPrisma = {
  devLog: { findMany: jest.Mock };
  insight: { upsert: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
};

function createPrismaMock(): MockPrisma {
  return {
    devLog: { findMany: jest.fn() },
    insight: { upsert: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
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
        {
          learnedNote: 'a',
          troubleshootingNote: null,
          tomorrowTask: null,
          tags: [],
        },
        {
          learnedNote: 'b',
          troubleshootingNote: '버그',
          tomorrowTask: null,
          tags: [{ tag: { displayName: 'react' } }],
        },
      ]);
      generator.generate.mockResolvedValue({
        summary: '요약',
        patterns: ['패턴1'],
      });
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

      const result = await service.generate(
        ownerId,
        InsightPeriodType.MONTHLY,
        '2026-08',
      );

      expect(generator.generate).toHaveBeenCalledWith({
        logs: [
          {
            learnedNote: 'a',
            troubleshootingNote: null,
            tomorrowTask: null,
            tags: [],
          },
          {
            learnedNote: 'b',
            troubleshootingNote: '버그',
            tomorrowTask: null,
            tags: ['react'],
          },
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
          create: expect.objectContaining({
            logCount: 2,
            summary: '요약',
            patterns: ['패턴1'],
          }),
          update: expect.objectContaining({
            logCount: 2,
            summary: '요약',
            patterns: ['패턴1'],
          }),
        }),
      );
      expect(result.logCount).toBe(2);
    });
  });

  describe('findByPeriod', () => {
    it('형식이 잘못된 periodKey는 400이고 DB를 호출하지 않는다', async () => {
      await expect(
        service.findByPeriod(ownerId, InsightPeriodType.WEEKLY, 'not-a-key'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.insight.findUnique).not.toHaveBeenCalled();
    });

    it('미래 기간은 400', async () => {
      await expect(
        service.findByPeriod(ownerId, InsightPeriodType.MONTHLY, '2999-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('저장된 결과가 있으면 그대로 반환한다', async () => {
      const saved = {
        id: 'insight-1',
        ownerId,
        periodType: InsightPeriodType.MONTHLY,
        periodKey: '2026-08',
        summary: '요약',
        patterns: [],
        logCount: 1,
        generatedAt: new Date(),
      };
      prisma.insight.findUnique.mockResolvedValue(saved);

      const result = await service.findByPeriod(
        ownerId,
        InsightPeriodType.MONTHLY,
        '2026-08',
      );

      expect(prisma.insight.findUnique).toHaveBeenCalledWith({
        where: {
          ownerId_periodType_periodKey: {
            ownerId,
            periodType: InsightPeriodType.MONTHLY,
            periodKey: '2026-08',
          },
        },
      });
      expect(result).toEqual(saved);
    });

    it('저장된 결과가 없으면 null을 반환한다', async () => {
      prisma.insight.findUnique.mockResolvedValue(null);

      const result = await service.findByPeriod(
        ownerId,
        InsightPeriodType.WEEKLY,
        '2026-W31',
      );

      expect(result).toBeNull();
    });
  });

  describe('latest', () => {
    it('주간/월간 각각 가장 최근 생성분을 반환한다', async () => {
      prisma.insight.findFirst
        .mockResolvedValueOnce({
          id: 'w1',
          periodType: InsightPeriodType.WEEKLY,
        })
        .mockResolvedValueOnce(null);

      const result = await service.latest(ownerId);

      expect(result).toEqual({
        weekly: { id: 'w1', periodType: InsightPeriodType.WEEKLY },
        monthly: null,
      });
    });
  });
});
