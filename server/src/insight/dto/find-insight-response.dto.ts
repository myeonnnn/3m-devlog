import { ApiProperty } from '@nestjs/swagger';
import { InsightResponseDto } from './insight-response.dto';

export class FindInsightResponseDto {
  @ApiProperty({ type: () => InsightResponseDto, nullable: true })
  insight: InsightResponseDto | null;
}
