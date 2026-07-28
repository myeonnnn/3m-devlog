import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UserService } from '../../users/user.service';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly userService: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      scope: ['profile', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const user = await this.userService.findOrCreateByProvider({
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value,
    });
    done(null, user);
  }
}
