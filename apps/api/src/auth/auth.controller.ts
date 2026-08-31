import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/req/signup.dto';
import { LoginDto } from './dto/req/login.dto';
import { Response, Request } from 'express';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { COOKIE_KEYS } from '../constant/cookies';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { authCookieOptions } from './cookie-options';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return await this.authService.signup(signupDto);
  }

  // 전역 한도(분당 60회)로는 비밀번호 시도를 막지 못한다.
  // 주의: 인메모리 스토리지라 replicas: 2 환경에서는 인스턴스별로 카운트가 분리된다.
  // (Redis 스토리지 도입은 별도 작업)
  @Throttle({ 'rate-limit': { limit: 5, ttl: 60_000 } })
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie(COOKIE_KEYS.ACCESS_TOKEN, authCookieOptions());
    res.clearCookie(COOKIE_KEYS.REFRESH_TOKEN, authCookieOptions());
    return { message: 'Logged out successfully' };
  }

  private setTokensInCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
      ...authCookieOptions(),
      maxAge: 15 * 60 * 1000, // 15분 (15 minutes)
    });
    res.cookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
      ...authCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (7 days)
    });
  }
}
