import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { completeAtAuthDeadline } from './complete-at-auth-deadline';

describe('completeAtAuthDeadline', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('JWT exp에서 완료하고 이후 이벤트 전달과 source 구독을 중단한다', () => {
    const source = new Subject<string>();
    const next = jest.fn();
    const complete = jest.fn();
    const cleanup = jest.fn();
    completeAtAuthDeadline(
      source.pipe(finalize(cleanup)),
      130,
      () => 100_000,
    ).subscribe({ next, complete });

    source.next('before');
    jest.advanceTimersByTime(29_999);
    expect(complete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    source.next('after');
    expect(next.mock.calls).toEqual([['before']]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    ['API key', undefined],
    ['만료까지 30분 남은 JWT', 1900],
  ])('%s도 연결 시작 후 15분에서 완료한다', (_label, exp) => {
    const complete = jest.fn();
    completeAtAuthDeadline(
      new Subject<string>(),
      exp,
      () => 100_000,
    ).subscribe({ complete });

    jest.advanceTimersByTime(899_999);
    expect(complete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('이미 만료된 JWT는 다음 timer tick에서 완료한다', () => {
    const complete = jest.fn();
    completeAtAuthDeadline(new Subject<string>(), 99, () => 100_000)
      .subscribe({ complete });

    jest.advanceTimersByTime(0);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('실제 구독 시점에 JWT의 남은 시간을 계산한다', () => {
    let currentTime = 100_000;
    const complete = jest.fn();
    const stream$ = completeAtAuthDeadline(
      new Subject<string>(),
      130,
      () => currentTime,
    );
    currentTime = 120_000;
    stream$.subscribe({ complete });

    jest.advanceTimersByTime(9_999);
    expect(complete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('client unsubscribe 때 source와 deadline timer를 정리한다', () => {
    const cleanup = jest.fn();
    const subscription = completeAtAuthDeadline(
      new Subject<string>().pipe(finalize(cleanup)),
      undefined,
      () => 100_000,
    ).subscribe();

    expect(jest.getTimerCount()).toBe(1);
    subscription.unsubscribe();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
