import { ApiProperty } from '@nestjs/swagger';

export class DevLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ format: 'date' })
  logDate: string;

  @ApiProperty()
  learnedNote: string;

  @ApiProperty({ type: String, nullable: true })
  troubleshootingNote: string | null;

  @ApiProperty({ type: String, nullable: true })
  tomorrowTask: string | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}
