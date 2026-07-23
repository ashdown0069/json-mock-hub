import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/req/signup.dto';
import { LoginDto } from './dto/req/login.dto';
import { Response, Request } from 'express';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { COOKIE_KEYS } from '../constant/cookies';
import { Serialize } from '../interceptors/serialize.interceptor';
import { GetUserDto } from '../users/dto/res/get-user.dto';
import { CurrentUserId } from './decorators/current-user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      return res.redirect(
        `${this.configService.get<string>('CLIENT_URL', 'http://localhost:4000')}/login?error=OAuthFailed`,
      );
    }

    const tokens = await this.authService.generateTokensForUser(req.user);
    this.setTokensInCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.redirect(
      this.configService.get<string>('CLIENT_URL', 'http://localhost:4000'),
    );
  }

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return await this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(loginDto);
    this.setTokensInCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Logged in successfully' };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUserId() userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_KEYS.REFRESH_TOKEN];
    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    this.setTokensInCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens refreshed' };
  }

  private static readonly COOKIE_BASE_OPTIONS = {
    httpOnly: true,
    // __Host- 접두사는 Secure 필수(없으면 브라우저가 쿠키를 폐기)이고,
    // SameSite=None도 Secure를 요구한다. localhost는 http에서도 Secure 쿠키를
    // 허용하므로 개발/배포 동일하게 항상 true로 둔다.
    secure: true,
    // cross-site 배포에서도 쿠키가 전송되도록 None으로 고정한다.
    sameSite: 'none',
    path: '/',
  } as const;

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie(
      COOKIE_KEYS.ACCESS_TOKEN,
      AuthController.COOKIE_BASE_OPTIONS,
    );
    res.clearCookie(
      COOKIE_KEYS.REFRESH_TOKEN,
      AuthController.COOKIE_BASE_OPTIONS,
    );
    return { message: 'Logged out successfully' };
  }

  private setTokensInCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
      ...AuthController.COOKIE_BASE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15분 (15 minutes)
    });
    res.cookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
      ...AuthController.COOKIE_BASE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (7 days)
    });
  }
}
