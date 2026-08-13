import express from 'express';
import request from 'supertest';
import { TRUST_PROXY_HOPS } from './trust-proxy';

/**
 * trust proxy가 true였다면 위조한 X-Forwarded-For가 그대로 req.ip가 되고,
 * ThrottlerGuard의 추적 키가 요청자 마음대로 바뀌어 rate limit이 뚫린다.
 * 여기서는 req.ip 계산 자체를 검증한다.
 */
function buildApp(trustProxy: number | boolean) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.get('/ip', (req, res) => {
    res.json({ ip: req.ip });
  });
  return app;
}

describe('TRUST_PROXY_HOPS', () => {
  it('Cloudflare -> Nginx 2단 구성에 맞춰 2로 고정되어 있다', () => {
    expect(TRUST_PROXY_HOPS).toBe(2);
  });

  it('true가 아니라 정수여야 한다 — true는 X-Forwarded-For 전체를 신뢰한다', () => {
    expect(typeof TRUST_PROXY_HOPS).toBe('number');
    expect(Number.isInteger(TRUST_PROXY_HOPS)).toBe(true);
  });
});

describe('설정한 홉 수에서의 req.ip 계산', () => {
  it('요청자가 써 넣은 X-Forwarded-For 값이 req.ip가 되지 않는다', async () => {
    const res = await request(buildApp(TRUST_PROXY_HOPS))
      .get('/ip')
      .set('X-Forwarded-For', '6.6.6.6, 10.0.0.1, 10.0.0.2');

    expect(res.body.ip).not.toBe('6.6.6.6');
  });

  it('위조 값을 매번 바꿔도 req.ip가 동일하게 유지된다', async () => {
    const app = buildApp(TRUST_PROXY_HOPS);

    const first = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '1.1.1.1, 10.0.0.1, 10.0.0.2');
    const second = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '2.2.2.2, 10.0.0.1, 10.0.0.2');

    // rate limit 추적 키가 요청자에 의해 흔들리지 않는다는 뜻이다
    expect(first.body.ip).toBe(second.body.ip);
  });

  it('대조군: trust proxy가 true면 위조 값이 그대로 req.ip가 된다', async () => {
    const res = await request(buildApp(true))
      .get('/ip')
      .set('X-Forwarded-For', '6.6.6.6, 10.0.0.1, 10.0.0.2');

    expect(res.body.ip).toBe('6.6.6.6');
  });
});
