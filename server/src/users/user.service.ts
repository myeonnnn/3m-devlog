import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider } from '../../generated/prisma/enums';

export interface OAuthProfile {
  provider: AuthProvider;
  providerUserId: string;
  displayName: string;
  email?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByProvider(profile: OAuthProfile) {
    const existing = await this.prisma.user.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        displayName: profile.displayName,
        email: profile.email,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * 계정과 그 계정으로 작성된 모든 DevLog, Insight를 영구 삭제한다 (복구 불가).
   * DevLog/Insight의 ownerId는 User.id를 FK로 참조하지 않는 컨텍스트 간 느슨한 결합이라
   * DB cascade가 없으므로 애플리케이션에서 직접 정리한다.
   */
  async deleteAccountAndData(id: string) {
    await this.prisma.$transaction([
      this.prisma.devLog.deleteMany({ where: { ownerId: id } }),
      this.prisma.insight.deleteMany({ where: { ownerId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }
}
