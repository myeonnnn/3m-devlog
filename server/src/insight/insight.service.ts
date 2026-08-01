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
