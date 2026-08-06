import { ApiProperty } from '@nestjs/swagger';

export class PopularTagResponseDto {
  @ApiProperty()
  tag: string;

  @ApiProperty()
  count: number;
}
