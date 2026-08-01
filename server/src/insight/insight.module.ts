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
