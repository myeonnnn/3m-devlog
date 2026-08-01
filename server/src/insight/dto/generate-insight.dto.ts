import { IsIn, IsString } from 'class-validator';
import { InsightPeriodType } from '../../../generated/prisma/enums';

export class GenerateInsightDto {
  @IsIn(Object.values(InsightPeriodType))
  periodType: InsightPeriodType;

  @IsString()
  periodKey: string;
}
