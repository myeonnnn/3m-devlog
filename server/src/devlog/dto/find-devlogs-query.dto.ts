import { IsOptional, IsString } from 'class-validator';

export class FindDevLogsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}
