import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';

@Injectable()
export class TransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * 콜백을 단일 MongoDB 트랜잭션으로 실행한다.
   *
   * 콜백 안에서 이 컬렉션을 건드리는 모든 모델 호출에 session을 전달해야 한다 —
   * 쓰기뿐 아니라 읽기도 마찬가지다. session 없는 read는 트랜잭션 스냅샷이 아니라
   * 커밋된 데이터를 읽으므로, 같은 트랜잭션에서 방금 쓴 결과가 보이지 않는다.
   *
   * 롤백되지 않는 외부 부수효과(Redis, HTTP, 이벤트 발행)는 콜백 안에서 수행하지 말고,
   * 이 메서드가 반환된 뒤 — 즉 커밋이 확정된 뒤 — 실행한다.
   */
  async withTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      // 커밋 자체가 실패한 경우 트랜잭션은 이미 끝난 상태다. 그대로 abort를 부르면
      // 드라이버가 던지는 예외가 원본 에러를 덮어써 원인 추적이 불가능해진다.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
