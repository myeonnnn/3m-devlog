import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * JwtAuthGuard가 request.user를 채워준 뒤 사용한다 (JwtStrategy.validate가 { id } 반환).
 */
export const OwnerId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: { id: string } }>();
    return request.user.id;
  },
);
