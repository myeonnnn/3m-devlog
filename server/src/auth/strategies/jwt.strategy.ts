import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserService } from '../../users/user.service';

function extractFromCookie(req: Request): string | null {
  return (
    (req?.cookies as Record<string, string> | undefined)?.access_token ?? null
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: extractFromCookie,
      secretOrKey: process.env.JWT_SECRET ?? '',
    });
  }

  /** 토큰 서명뿐 아니라 계정이 실제로 남아있는지도 확인한다 (회원탈퇴 후 재사용 방지). */
  async validate(payload: { sub: string }) {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 계정이에요.');
    }
    return { id: payload.sub };
  }
}
