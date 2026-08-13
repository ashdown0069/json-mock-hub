import { validateEnv } from './env.validation';

const validEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/test',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
};

describe('validateEnv', () => {
  it('필수 변수가 모두 있으면 config를 그대로 반환한다', () => {
    expect(validateEnv({ ...validEnv, EXTRA: 'x' })).toEqual({
      ...validEnv,
      EXTRA: 'x',
    });
  });

  it('누락된 변수명을 모두 담아 에러를 던진다', () => {
    expect(() => validateEnv({ MONGODB_URI: 'mongodb://localhost' })).toThrow(
      /JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET/,
    );
  });

  it('빈 문자열은 미설정으로 취급한다', () => {
    expect(() => validateEnv({ ...validEnv, JWT_REFRESH_SECRET: '' })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
  });

  it('문자열이 아닌 값도 미설정으로 취급한다', () => {
    expect(() =>
      validateEnv({ ...validEnv, JWT_ACCESS_SECRET: 123 }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
