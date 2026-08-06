import { ApiProperty } from '@nestjs/swagger';
import { InsightPeriodType } from '../../../generated/prisma/enums';

export class InsightResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ enum: InsightPeriodType })
  periodType: InsightPeriodType;

  @ApiProperty()
  periodKey: string;

  @ApiProperty()
  summary: string;

  @ApiProperty({ type: [String] })
  patterns: string[];

  @ApiProperty()
  logCount: number;

  @ApiProperty({ format: 'date-time' })
  generatedAt: string;
}
