import { ApiProperty } from '@nestjs/swagger';
import { DevLogResponseDto } from './devlog-response.dto';

export class DevLogPageResponseDto {
  @ApiProperty({ type: [DevLogResponseDto] })
  items: DevLogResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;
}
