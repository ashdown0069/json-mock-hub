import {
  All,
  Controller,
  Req,
  Res,
  HttpStatus,
  HttpException,
  Query,
  Body,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MockserverService } from './mockserver.service';
import {
  extractWorkspaceId,
  firstForwardedHost,
  normalizeMockPath,
} from './mockserver.util';
import { RequestLogService } from './request-log.service';

@SkipThrottle()
@Controller('api')
export class MockserverController {
  private readonly baseDomain: string;

  constructor(
    private readonly mockserverService: MockserverService,
    private readonly configService: ConfigService,
    private readonly requestLogService: RequestLogService,
  ) {
    // 환경변수로부터 베이스 도메인을 로드합니다 (기본값 localhost:3000)
    this.baseDomain =
      this.configService.get<string>('MOCK_BASE_DOMAIN') ?? 'localhost:3000';
  }

  @All('*')
  async handleAll(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
    @Body() reqBody: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 다단 프록시에서 배열/콤마 결합으로 들어올 수 있으므로 첫 값으로 정규화한다
    const hostHeader =
      firstForwardedHost(
        req.headers['x-forwarded-host'] as string | string[] | undefined,
      ) ?? req.hostname;
    const workspaceId = extractWorkspaceId(hostHeader, this.baseDomain);

    // 호스트 헤더가 적절하지 않거나 서브도메인이 비어 있으면 404 예외를 던집니다.
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      // workspace 귀속이 불가능한 요청이므로 로깅하지 않습니다.
      throw new HttpException(
        '유효한 워크스페이스 서브도메인이 아닙니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    let logStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    try {
      // 서비스 레이어에 비즈니스 로직(파일 조회 및 목 응답 조립)을 위임합니다
      const result = await this.mockserverService.resolveRequest(
        workspaceId,
        req.path,
        req.method,
        query,
        reqBody,
      );

      // NestJS passthrough 옵션을 활용해 상태 코드를 동적으로 설정하고 결과 본문을 직접 반환합니다
      logStatus = result.status;
      res.status(result.status);
      return result.body;
    } catch (error: any) {
      if (error instanceof HttpException) {
        logStatus = error.getStatus();
        throw error;
      }

      const status = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      logStatus = status;
      const message = error?.response ?? {
        message: error?.message ?? '알 수 없는 오류가 발생했습니다.',
      };
      throw new HttpException(message, status);
    } finally {
      // await 하지 않으므로 mock 응답 지연이 없습니다 (404 응답 포함 전 케이스 기록).
      this.requestLogService.record({
        workspaceId,
        method: req.method,
        path: normalizeMockPath(req.path),
        status: logStatus,
        ip: req.ip ?? null,
      });
    }
  }
}
