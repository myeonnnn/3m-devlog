import { ApiProperty } from '@nestjs/swagger';

export class StreakResponseDto {
  @ApiProperty()
  days: number;
}
