import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDevLogDto {
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  learnedNote?: string;

  @IsOptional()
  @IsString()
  troubleshootingNote?: string;

  @IsOptional()
  @IsString()
  tomorrowTask?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
