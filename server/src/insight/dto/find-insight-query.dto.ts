import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InsightPeriodType } from '../../../generated/prisma/enums';

export class FindInsightQueryDto {
  @ApiProperty({ enum: InsightPeriodType })
  @IsIn(Object.values(InsightPeriodType))
  periodType: InsightPeriodType;

  @IsString()
  periodKey: string;
}
