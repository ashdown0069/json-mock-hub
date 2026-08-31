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
    // 1. 미가입 이메일과 비밀번호 불일치를 같은 code·message로 응답한다.
    //    둘을 구분하면 응답만 보고 가입된 이메일을 골라낼 수 있다(account enumeration).
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'auth.login.invalid_credentials',
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    // 2. 평문 대조 — DB에는 bcrypt 해시만 있다.
    const isPasswordValid = user.password
      ? await bcrypt.compare(loginDto.password, user.password)
      : false;
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'auth.login.invalid_credentials',
        message: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    // 3. access·refresh를 함께 발급하고, refresh의 해시만 DB에 남긴다.
    //    응답에는 평문 refresh가 나가고 저장소에는 해시만 있으므로
    //    DB 덤프만으로는 세션을 재사용할 수 없다.
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.nickname,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  // refresh 토큰 회전(rotation). 갱신에 성공할 때마다 refresh 토큰 자체를 새로 발급하고
  // DB의 해시를 덮어써, 방금 사용한 토큰은 그 시점부터 무효가 된다.
  async refreshTokens(userId: string, refreshToken: string) {
    // 1. dbRefreshToken이 비어 있으면 이미 로그아웃된 세션이다.
    //    logout()이 이 필드를 null로 지우는 것이 세션 종료의 유일한 표식이다.
    const user = await this.usersService.findById(userId);
    if (!user || !user.dbRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    // 2. 사용자 미존재·로그아웃·토큰 불일치를 모두 같은 'Access Denied'로 응답해
    //    실패 사유가 새어나가지 않게 한다.
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.dbRefreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    // 3. 회전 — 새 해시로 교체하는 이 쓰기가 끝나야 이전 refresh 토큰이 죽는다.
    //    generateTokens와 updateRefreshToken의 순서를 바꾸면 방금 만든 토큰이 아니라
    //    직전 토큰의 해시가 남아 갱신이 1회 만에 깨진다.
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

  // access와 refresh는 페이로드가 같고 서명 시크릿·만료만 다르다.
  // 시크릿을 분리해 두었기 때문에 access 시크릿이 유출돼도 refresh 토큰을 위조할 수 없다.
  // 두 시크릿의 존재는 부팅 시 validateEnv(app.module.ts)가 보장한다.
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
