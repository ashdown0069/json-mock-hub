import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

/**
 * 모든 에러 응답이 따르는 단일 계약.
 * apps/mcp의 ApiClient와 apps/web의 useApiErrorHandler가 이 형태를 파싱한다.
 */
export interface ErrorResponseBody {
  statusCode: number;
  /** 클라이언트가 분기에 쓰는 안정적인 식별자. 매핑할 수 없으면 null */
  code: string | null;
  message: string;
  /** ValidationPipe가 준 개별 위반 메시지 목록 */
  details?: string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // SSE처럼 이미 스트림이 시작된 응답에는 개입하지 않는다 (헤더 재전송 시 크래시)
    if (res.headersSent) {
      return;
    }

    const body = AllExceptionsFilter.toErrorBody(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${body.code ?? 'unknown'}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(body.statusCode).json(body);
  }

  static toErrorBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof HttpException) {
      return AllExceptionsFilter.fromHttpException(exception);
    }

    // 잘못된 ObjectId 문자열: findOne({_id:'hello'})는 CastError,
    // new Types.ObjectId('hello')는 BSONError를 던진다. 둘 다 클라이언트 입력 오류이므로 400.
    if (
      exception instanceof MongooseError.CastError ||
      (exception instanceof Error && exception.name === 'BSONError')
    ) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'common.invalid_id',
        message: '잘못된 형식의 식별자입니다.',
      };
    }

    if ((exception as { code?: number } | null)?.code === 11000) {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: 'common.duplicate',
        message: '이미 존재하는 값입니다.',
      };
    }

    // 내부 오류 메시지는 클라이언트에 노출하지 않는다 (스택은 위에서 로깅)
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'common.internal_error',
      message: '서버 오류가 발생했습니다.',
    };
  }

  private static fromHttpException(
    exception: HttpException,
  ): ErrorResponseBody {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { statusCode, code: null, message: response };
    }

    const payload = response as Record<string, unknown>;
    const raw = payload.message;

    // ValidationPipe는 { statusCode, message: string[], error } 형태를 만든다
    if (Array.isArray(raw)) {
      const details = raw.map(String);
      return {
        statusCode,
        code: 'common.validation_failed',
        message: details.join(' / '),
        details,
      };
    }

    // 서비스가 던지는 { code, message }와 { message, key } 두 형태를 모두 받는다
    const code =
      typeof payload.code === 'string'
        ? payload.code
        : typeof payload.key === 'string'
          ? payload.key
          : null;

    return {
      statusCode,
      code,
      message: typeof raw === 'string' ? raw : exception.message,
    };
  }
}
