import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import {
  AllExceptionsFilter,
  ErrorResponseBody,
} from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    headersSent: boolean;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse as unknown as Response,
        getRequest: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ArgumentsHost;
  });

  it('HttpException 문자열 응답을 올바른 포맷으로 변환해야 한다', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.FORBIDDEN,
      code: null,
      message: 'Forbidden',
    });
  });

  it('ValidationPipe 에러 배열을 details에 담고 결합 메시지를 생성해야 한다', () => {
    const validationError = new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(validationError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'common.validation_failed',
      message: 'email must be an email / name should not be empty',
      details: ['email must be an email', 'name should not be empty'],
    });
  });

  it('Mongoose CastError를 400 Bad Request(common.invalid_id)로 변환해야 한다', () => {
    const castError = new MongooseError.CastError(
      'ObjectId',
      'invalid_id',
      'id',
    );
    filter.catch(castError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'common.invalid_id',
      message: '잘못된 형식의 식별자입니다.',
    });
  });

  it('MongoDB 중복 키 에러(11000)를 409 Conflict(common.duplicate)로 변환해야 한다', () => {
    const duplicateError = { code: 11000, message: 'duplicate key error' };
    filter.catch(duplicateError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      code: 'common.duplicate',
      message: '이미 존재하는 값입니다.',
    });
  });

  it('알 수 없는 예외는 500 Internal Server Error로 마스킹해야 한다', () => {
    const unknownError = new Error('Database connection failed');
    filter.catch(unknownError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'common.internal_error',
      message: '서버 오류가 발생했습니다.',
    });
  });

  it('headersSent가 true이면 응답을 보내지 않아야 한다', () => {
    mockResponse.headersSent = true;
    const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
