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
}
