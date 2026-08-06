import { ApiProperty } from '@nestjs/swagger';
import { PopularTagResponseDto } from './popular-tag-response.dto';

export class DevLogStatsResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: [PopularTagResponseDto] })
  topTags: PopularTagResponseDto[];
}
