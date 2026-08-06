import { ApiProperty } from '@nestjs/swagger';
import { InsightResponseDto } from './insight-response.dto';

export class LatestInsightResponseDto {
  @ApiProperty({ type: () => InsightResponseDto, nullable: true })
  weekly: InsightResponseDto | null;

  @ApiProperty({ type: () => InsightResponseDto, nullable: true })
  monthly: InsightResponseDto | null;
}
