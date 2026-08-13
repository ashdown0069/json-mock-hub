import { Connection } from 'mongoose';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  type SessionMock = Record<string, jest.Mock>;

  const createSession = (overrides: SessionMock = {}) => {
    const session: SessionMock = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
      inTransaction: jest.fn().mockReturnValue(true),
      ...overrides,
    };
    return session;
  };

  const createService = (session: SessionMock) => {
    const connection = {
      startSession: jest.fn().mockResolvedValue(session),
    } as unknown as Connection;
    return new TransactionService(connection);
  };

  it('작업이 성공하면 커밋하고 세션을 닫는다', async () => {
    const session = createSession();
    const service = createService(session);

    const result = await service.withTransaction(async () => 'ok');

    expect(result).toBe('ok');
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('작업이 실패하면 롤백하고 원본 에러를 그대로 던진다', async () => {
    const session = createSession();
    const service = createService(session);
    const boom = new Error('작업 실패');

    await expect(
      service.withTransaction(async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('커밋이 실패하면 abort를 다시 부르지 않고 커밋 에러를 그대로 던진다', async () => {
    const commitError = new Error('커밋 실패');
    const session = createSession({
      commitTransaction: jest.fn().mockRejectedValue(commitError),
      inTransaction: jest.fn().mockReturnValue(false),
    });
    const service = createService(session);

    await expect(service.withTransaction(async () => 'ok')).rejects.toBe(
      commitError,
    );

    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
