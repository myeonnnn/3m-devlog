import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDevLogDto {
  @IsDateString()
  logDate: string;

  @IsString()
  @MinLength(1)
  learnedNote: string;

  @IsOptional()
  @IsString()
  troubleshootingNote?: string;

  @IsOptional()
  @IsString()
  tomorrowTask?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
