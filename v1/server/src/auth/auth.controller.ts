import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnerId } from '../common/decorators/owner-id.decorator';

const COOKIE_NAME = 'access_token';

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
      user && { id: user.id, displayName: user.displayName, email: user.email }
    );
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(COOKIE_NAME);
    res.status(204).send();
  }

  private issueCookieAndRedirect(req: Request, res: Response) {
    const user = req.user as { id: string };
    const token = this.authService.issueToken(user.id);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:3000');
  }
}
