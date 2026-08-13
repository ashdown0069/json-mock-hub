import {
  All,
  Controller,
  Req,
  Res,
  HttpStatus,
  HttpException,
  Query,
  Body,
  UseGuards,
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
import { MockWriteThrottlerGuard } from './mock-write-throttler.guard';

// 전역 'rate-limit' 한도만 건너뛴다. 인자 없는 @SkipThrottle()을 쓰면
// 아래 MockWriteThrottlerGuard의 'mock-write' 한도까지 함께 무력화된다.
@SkipThrottle({ 'rate-limit': true })
@UseGuards(MockWriteThrottlerGuard)
@Controller('api')
export class MockserverController {
  private readonly baseDomain: string;

  constructor(
    private readonly mockserverService: MockserverService,
    private readonly configService: ConfigService,
    private readonly requestLogService: RequestLogService,
  ) {
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

    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      // workspace 귀속이 불가능한 요청이므로 로깅하지 않습니다.
      throw new HttpException(
        '유효한 워크스페이스 서브도메인이 아닙니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    let logStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    try {
      const result = await this.mockserverService.resolveRequest(
        workspaceId,
        req.path,
        req.method,
        query,
        reqBody,
      );

      logStatus = result.status;
      // item.json 원소가 문자열이면 express가 Content-Type을 text/html로 추론해
      // 저장형 XSS가 성립한다. mock 응답은 항상 JSON이므로 명시적으로 고정한다.
      res.type('application/json');
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
