import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightService } from './insight.service';
import { GenerateInsightDto } from './dto/generate-insight.dto';
import { FindInsightQueryDto } from './dto/find-insight-query.dto';
import { InsightResponseDto } from './dto/insight-response.dto';
import { FindInsightResponseDto } from './dto/find-insight-response.dto';
import { LatestInsightResponseDto } from './dto/latest-insight-response.dto';

@ApiTags('insights')
@ApiCookieAuth()
@Controller('insights')
export class InsightController {
  constructor(private readonly insightService: InsightService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: InsightResponseDto })
  generate(@OwnerId() ownerId: string, @Body() dto: GenerateInsightDto) {
    return this.insightService.generate(ownerId, dto.periodType, dto.periodKey);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: FindInsightResponseDto })
  async findByPeriod(@OwnerId() ownerId: string, @Query() dto: FindInsightQueryDto) {
    const insight = await this.insightService.findByPeriod(ownerId, dto.periodType, dto.periodKey);
    return { insight };
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LatestInsightResponseDto })
  latest(@OwnerId() ownerId: string) {
    return this.insightService.latest(ownerId);
  }
}
