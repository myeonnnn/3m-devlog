import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * 소셜 로그인이 아직 없어서 임시로 헤더에서 ownerId를 읽는다.
 * 인증 붙으면 이 데코레이터를 인증된 사용자 컨텍스트로 교체한다.
 */
export const OwnerId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const ownerId = request.header('x-user-id');

    if (!ownerId) {
      throw new BadRequestException('x-user-id header is required');
    }

    return ownerId;
  },
);
