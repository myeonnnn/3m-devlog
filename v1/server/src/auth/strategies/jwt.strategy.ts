import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

function extractFromCookie(req: Request): string | null {
  return (
    (req?.cookies as Record<string, string> | undefined)?.access_token ?? null
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractFromCookie,
      secretOrKey: process.env.JWT_SECRET ?? '',
    });
  }

  validate(payload: { sub: string }) {
    return { id: payload.sub };
  }
}
