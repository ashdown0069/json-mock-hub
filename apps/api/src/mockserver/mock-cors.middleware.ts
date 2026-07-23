import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// 목 서버 전용 CORS 미들웨어입니다.
// 전역 CORS는 대시보드 오리진 전용으로 고정되어 있으므로,
// 외부 앱의 API 요청을 허용하기 위해 모든 Origin(*) 및 메소드를 열어줍니다.
@Injectable()
export class MockCorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );

    // OPTIONS 프리플라이트 요청은 204 No Content로 조기 반환합니다.
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  }
}
