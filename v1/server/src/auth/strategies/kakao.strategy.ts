import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { UserService } from '../../users/user.service';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly userService: UserService) {
    super({
      clientID: process.env.KAKAO_CLIENT_ID ?? '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackURL: process.env.KAKAO_CALLBACK_URL ?? '',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown) => void,
  ) {
    const user = await this.userService.findOrCreateByProvider({
      provider: AuthProvider.KAKAO,
      providerUserId: profile.id,
      displayName: profile.displayName,
    });
    done(null, user);
  }
}
