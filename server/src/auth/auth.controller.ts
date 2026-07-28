import {
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnerId } from '../common/decorators/owner-id.decorator';

const COOKIE_NAME = 'access_token';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * 프로덕션에서는 HTTPS가 기본이라 secure를 켜고, 프론트/백엔드가 서로 다른
 * 도메인(cross-site)에 배포될 수도 있으므로 sameSite도 'none'으로 넓혀둔다.
 * (sameSite: 'none'은 secure: true가 있어야 브라우저가 허용한다.)
 * 로컬 개발은 http://localhost라 secure 쿠키가 저장되지 않으므로 lax를 쓴다.
 */
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    this.issueCookieAndRedirect(req, res);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  kakaoCallback(@Req() req: Request, @Res() res: Response) {
    this.issueCookieAndRedirect(req, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@OwnerId() userId: string) {
    const user = await this.userService.findById(userId);
    return (
      user && {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        provider: user.provider,
      }
    );
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).send();
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@OwnerId() userId: string, @Res() res: Response) {
    await this.userService.deleteAccountAndData(userId);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).send();
  }

  private issueCookieAndRedirect(req: Request, res: Response) {
    const user = req.user as { id: string };
    const token = this.authService.issueToken(user.id);

    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:3000');
  }
}
