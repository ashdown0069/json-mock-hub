import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/req/signup.dto';
import { LoginDto } from './dto/req/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new ConflictException({
        code: 'auth.signup.email_exists',
        message: '이미 가입된 이메일 주소입니다.',
      });
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    await this.usersService.create({
      ...signupDto,
      password: hashedPassword,
    });

    return {
      message: '회원가입이 완료되었습니다.',
      success: true,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'auth.login.invalid_credentials',
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'auth.login.invalid_credentials',
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.nickname,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.dbRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.dbRefreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.nickname,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateOAuthLogin(
    email: string,
    nickname: string,
    providerId: string,
    provider: 'google',
  ) {
    let user = await this.usersService.findByEmail(email);

    if (user) {
      if (user.provider !== provider || user.providerId !== providerId) {
        user = await this.usersService.updateProvider(
          user._id.toString(),
          provider,
          providerId,
        );
      }
    } else {
      user = await this.usersService.create({
        email,
        nickname: nickname || email.split('@')[0],
        password: null,
      });
      user = await this.usersService.updateProvider(
        user._id.toString(),
        provider,
        providerId,
      );
    }

    return user;
  }

  async generateTokensForUser(user: any) {
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.nickname,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(
    userId: string,
    email: string,
    nickname: string,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, nickname },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<any>('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, nickname },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<any>('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
  }
}
