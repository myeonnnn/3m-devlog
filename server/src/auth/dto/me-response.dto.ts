import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '../../../generated/prisma/enums';

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: String, nullable: true })
  email: string | null;

  @ApiProperty({ enum: AuthProvider })
  provider: AuthProvider;
}
