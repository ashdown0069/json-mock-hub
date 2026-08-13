import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    // 500 변환 테스트가 실제 에러 로그를 출력하지 않도록 막는다
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createHost = () => {
    const res: Record<string, any> = { headersSent: false };
    res.json = jest.fn();
    res.status = jest.fn(() => res);
    const host = {
      switchToHttp: () => ({ getResponse: () => res }),
    } as any;
    return { host, res };
  };

  const capture = (exception: unknown) => {
    const { host, res } = createHost();
    new AllExceptionsFilter().catch(exception, host);
    return {
      status: res.status.mock.calls[0]?.[0],
      body: res.json.mock.calls[0]?.[0],
    };
  };

  it('ValidationPipe의 배열 메시지를 details로 보존하고 한 문장으로 합친다', () => {
    const { status, body } = capture(
      new BadRequestException({
        statusCode: 400,
        message: ['이름은 한글, 영문, 숫자만 사용할 수 있습니다.', 'itemType 오류'],
        error: 'Bad Request',
      }),
    );

    expect(status).toBe(400);
    expect(body.code).toBe('common.validation_failed');
    expect(body.details).toEqual([
      '이름은 한글, 영문, 숫자만 사용할 수 있습니다.',
      'itemType 오류',
    ]);
    expect(body.message).toContain('이름은 한글');
  });

  it('{ code, message } 형태의 예외는 code를 그대로 노출한다', () => {
    const { status, body } = capture(
      new ForbiddenException({
        code: 'workspace.permission.denied',
        message: '이 작업을 수행할 권한이 없습니다.',
      }),
    );

    expect(status).toBe(403);
    expect(body).toEqual({
      statusCode: 403,
      code: 'workspace.permission.denied',
      message: '이 작업을 수행할 권한이 없습니다.',
    });
  });

  it('{ message, key } 형태의 예외는 key를 code로 승격한다', () => {
    const { body } = capture(
      new BadRequestException({
        message: 'File name already exists',
        key: 'duplicate',
      }),
    );

    expect(body.code).toBe('duplicate');
    expect(body.message).toBe('File name already exists');
  });

  it('문자열 메시지 예외는 message만 담고 code는 null이다', () => {
    const { status, body } = capture(new NotFoundException('Item not found'));

    expect(status).toBe(404);
    expect(body.code).toBeNull();
    expect(body.message).toBe('Item not found');
  });

  it('Mongoose CastError를 400 common.invalid_id로 변환한다', () => {
    const { status, body } = capture(
      new MongooseError.CastError('ObjectId', 'hello', '_id'),
    );

    expect(status).toBe(400);
    expect(body.code).toBe('common.invalid_id');
  });

  it('BSONError를 400 common.invalid_id로 변환한다', () => {
    // new Types.ObjectId('hello')가 던지는 예외를 이름으로 식별한다
    const bsonError = new Error('input must be a 24 character hex string');
    bsonError.name = 'BSONError';

    const { status, body } = capture(bsonError);

    expect(status).toBe(400);
    expect(body.code).toBe('common.invalid_id');
  });

  it('MongoDB 중복 키(E11000)를 409 common.duplicate로 변환한다', () => {
    const duplicateError = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
    });

    const { status, body } = capture(duplicateError);

    expect(status).toBe(409);
    expect(body.code).toBe('common.duplicate');
  });

  it('알 수 없는 예외는 500으로 변환하고 내부 메시지를 노출하지 않는다', () => {
    const { status, body } = capture(
      new Error('connect ECONNREFUSED 127.0.0.1:27017'),
    );

    expect(status).toBe(500);
    expect(body.code).toBe('common.internal_error');
    expect(body.message).not.toContain('ECONNREFUSED');
  });

  it('이미 응답이 시작된 경우(SSE) 개입하지 않는다', () => {
    const { host, res } = createHost();
    res.headersSent = true;

    new AllExceptionsFilter().catch(new Error('boom'), host);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
