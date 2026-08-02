import { IsIn, IsString } from 'class-validator';
import { InsightPeriodType } from '../../../generated/prisma/enums';

export class FindInsightQueryDto {
  @IsIn(Object.values(InsightPeriodType))
  periodType: InsightPeriodType;

  @IsString()
  periodKey: string;
}
