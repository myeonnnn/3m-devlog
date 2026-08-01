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
