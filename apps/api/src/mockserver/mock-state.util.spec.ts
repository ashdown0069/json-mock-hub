import {
  createEmptyOverlay,
  normalizeOverlay,
  OVERLAY_VERSION,
  applyOverlay,
  computeNextId,
  applyCreate,
  applyUpdate,
  applyDelete,
  MAX_OVERLAY_CREATED_ROWS,
} from './mock-state.util';

const base = [
  { id: 1, name: 'kim' },
  { id: 2, name: 'lee' },
];

describe('applyOverlay', () => {
  it('빈 오버레이는 base와 동일한 내용을 반환한다', () => {
    expect(applyOverlay(base, createEmptyOverlay())).toEqual(base);
  });

  it('created 항목을 뒤에 이어붙인다', () => {
    const overlay = { created: [{ id: 3, name: 'park' }], updated: {}, deleted: [] };
    expect(applyOverlay(base, overlay).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('deleted에 담긴 id는 결과에서 제외한다', () => {
    const overlay = { created: [], updated: {}, deleted: ['1'] };
    expect(applyOverlay(base, overlay).map((r) => r.id)).toEqual([2]);
  });

  it('updated 항목이 base 원본을 덮어쓴다', () => {
    const overlay = { created: [], updated: { '2': { id: 2, name: 'LEE' } }, deleted: [] };
    expect(applyOverlay(base, overlay)).toEqual([
      { id: 1, name: 'kim' },
      { id: 2, name: 'LEE' },
    ]);
  });

  it('base에서 지운 id를 재사용한 created 행은 결과에 나타난다', () => {
    // deleted는 base 행 전용 블록리스트다. created에까지 적용하면
    // 지운 id를 재발급받은 행이 201을 받고도 조회되지 않는다.
    const overlay = {
      created: [{ id: 1, name: 'new' }],
      updated: {},
      deleted: ['1'],
    };

    expect(applyOverlay(base, overlay)).toEqual([
      { id: 2, name: 'lee' },
      { id: 1, name: 'new' },
    ]);
  });
});

describe('computeNextId', () => {
  it('모든 id가 숫자면 최댓값+1을 반환한다', () => {
    expect(computeNextId(base)).toBe(3);
  });

  it('빈 배열이면 1을 반환한다', () => {
    expect(computeNextId([])).toBe(1);
  });

  it('문자열 id가 섞이면 문자열 id를 생성한다', () => {
    const next = computeNextId([{ id: 'abc' }]);
    expect(typeof next).toBe('string');
    expect((next as string).length).toBeGreaterThan(0);
  });

  it('행이 십만 개여도 스택 오버플로 없이 최댓값+1을 반환한다', () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({ id: i + 1 }));

    // Math.max(...ids) 스프레드는 인자 수 상한에 걸려 RangeError로 죽는다
    expect(computeNextId(rows)).toBe(100_001);
  });

  it('음수 id만 있어도 최댓값+1을 유지한다', () => {
    expect(computeNextId([{ id: -5 }, { id: -3 }])).toBe(-2);
  });
});

describe('applyCreate', () => {
  it('id 미지정 시 다음 숫자 id를 부여하고 created에 추가한다', () => {
    const result = applyCreate(createEmptyOverlay(), base, { name: 'park' });
    if (!result.ok) throw new Error('상한에 걸리지 않아야 한다');
    const { overlay, created } = result;
    expect(created).toEqual({ name: 'park', id: 3 });
    expect(overlay.created).toEqual([{ name: 'park', id: 3 }]);
  });

  it('body에 id가 있으면 그대로 사용한다', () => {
    const result = applyCreate(createEmptyOverlay(), base, { id: 99, name: 'x' });
    if (!result.ok) throw new Error('상한에 걸리지 않아야 한다');
    const { created } = result;
    expect(created.id).toBe(99);
  });

  it('실효 컬렉션에 이미 있는 id를 주면 conflict로 거절한다', () => {
    // 통과시키면 applyOverlay의 override 규칙 때문에 기존 행이 조용히 교체되고
    // 응답은 201이라 클라이언트가 덮어쓴 사실을 알 수 없다
    const result = applyCreate(createEmptyOverlay(), base, {
      id: 1,
      name: '덮어씀',
    });

    expect(result).toEqual({ ok: false, reason: 'conflict' });
  });

  it('base에서 지운 id는 재사용을 허용한다', () => {
    // 지운 리소스를 같은 id로 다시 만드는 것은 합리적인 요청이다.
    // applyOverlay가 created에 deleted를 적용하지 않으므로 정상 조회된다.
    const overlay = { created: [], updated: {}, deleted: ['1'] };

    const result = applyCreate(overlay, base, { id: 1, name: 'again' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(applyOverlay(base, result.overlay)).toEqual([
      { id: 2, name: 'lee' },
      { id: 1, name: 'again' },
    ]);
  });

  it('상한 초과와 중복 id를 서로 다른 reason으로 구분한다', () => {
    const full = {
      created: Array.from({ length: MAX_OVERLAY_CREATED_ROWS }, (_, i) => ({
        id: i + 1000,
      })),
      updated: {},
      deleted: [] as string[],
    };

    const limited = applyCreate(full, base, { id: 1 });

    // 상한 검사가 먼저다 — 상한에 걸린 오버레이는 더 볼 것도 없다
    expect(limited).toEqual({ ok: false, reason: 'limit' });
  });

  it('생성 행이 상한에 도달하면 ok: false를 반환한다', () => {
    const overlay = {
      created: Array.from({ length: MAX_OVERLAY_CREATED_ROWS }, (_, i) => ({
        id: i + 1,
      })),
      updated: {},
      deleted: [],
    };

    const result = applyCreate(overlay, [], { name: 'x' });

    expect(result.ok).toBe(false);
  });

  it('상한 직전까지는 정상 생성한다', () => {
    const overlay = {
      created: Array.from(
        { length: MAX_OVERLAY_CREATED_ROWS - 1 },
        (_, i) => ({ id: i + 1 }),
      ),
      updated: {},
      deleted: [],
    };

    const result = applyCreate(overlay, [], { name: 'x' });

    expect(result.ok).toBe(true);
  });
});

describe('applyUpdate', () => {
  it('put 모드는 전체 교체하되 id를 보존한다', () => {
    const res = applyUpdate(createEmptyOverlay(), base, '1', { name: 'KIM' }, 'put');
    expect(res?.updated).toEqual({ name: 'KIM', id: 1 });
  });

  it('patch 모드는 기존 값과 병합한다', () => {
    const res = applyUpdate(createEmptyOverlay(), base, '1', { age: 10 }, 'patch');
    expect(res?.updated).toEqual({ id: 1, name: 'kim', age: 10 });
  });

  it('존재하지 않는 id는 null을 반환한다', () => {
    expect(applyUpdate(createEmptyOverlay(), base, '999', { name: 'x' }, 'put')).toBeNull();
  });
});

describe('applyDelete', () => {
  it('존재하는 id를 deleted에 추가한다', () => {
    const overlay = applyDelete(createEmptyOverlay(), base, '1');
    expect(overlay?.deleted).toContain('1');
    expect(applyOverlay(base, overlay!).map((r) => r.id)).toEqual([2]);
  });

  it('존재하지 않는 id는 null을 반환한다', () => {
    expect(applyDelete(createEmptyOverlay(), base, '999')).toBeNull();
  });

  it('생성 행을 지우면 deleted가 아니라 created에서 빠진다', () => {
    // 생성 행은 base에 없다. deleted에 넣으면 그 id가 블록리스트에 오르고
    // created 슬롯도 계속 차지해 MAX_OVERLAY_CREATED_ROWS 상한을 갉아먹는다.
    const withCreated = {
      created: [{ id: 3, name: 'park' }],
      updated: {},
      deleted: [] as string[],
    };

    const next = applyDelete(withCreated, base, '3');

    expect(next?.created).toEqual([]);
    expect(next?.deleted).toEqual([]);
    expect(applyOverlay(base, next!).map((r) => r.id)).toEqual([1, 2]);
  });

  it('생성 행을 수정한 뒤 지우면 updated 항목도 함께 회수한다', () => {
    // 참조가 사라진 updated 항목이 남으면 Redis 값이 불필요하게 커진다
    const withCreated = {
      created: [{ id: 3, name: 'park' }],
      updated: { '3': { id: 3, name: 'PARK' } },
      deleted: [] as string[],
    };

    const next = applyDelete(withCreated, base, '3');

    expect(next?.updated).toEqual({});
  });
});

describe('불변성', () => {
  it('리듀서는 입력 오버레이를 변형하지 않는다', () => {
    const overlay = createEmptyOverlay();
    applyCreate(overlay, base, { name: 'x' });
    expect(overlay).toEqual({ created: [], updated: {}, deleted: [] });
  });
});

describe('normalizeOverlay', () => {
  it('정상 오버레이는 그대로 통과시킨다', () => {
    const overlay = {
      created: [{ id: 3 }],
      updated: { '1': { id: 1 } },
      deleted: ['2'],
    };

    expect(normalizeOverlay(overlay)).toEqual(overlay);
  });

  it('표식이 없으면(구버전) created의 id가 deleted에 있는 생성 행을 버린다', () => {
    // 구버전 코드는 생성 행을 지울 때 created에 남긴 채 deleted에만 넣었다.
    // 교정하지 않으면 배포 직후 TTL(1시간) 동안 사용자가 지운 행이 되살아난다.
    const legacy = {
      created: [{ id: 3, name: 'park' }],
      updated: {},
      deleted: ['3'],
    };

    expect(normalizeOverlay(legacy).created).toEqual([]);
  });

  it('표식이 있으면 created의 id가 deleted에 있어도 그대로 둔다', () => {
    // 현재 규약에서 이 조합은 정상 상태다 — base에서 지운 id를 재사용해
    // 만든 행이 정확히 이 모양이다. 여기서 지우면 방금 만든 행이 사라진다.
    const current = {
      created: [{ id: 1, name: 'again' }],
      updated: {},
      deleted: ['1'],
      v: OVERLAY_VERSION,
    };

    expect(normalizeOverlay(current).created).toEqual([
      { id: 1, name: 'again' },
    ]);
  });

  it('표식은 결과에 남기지 않는다', () => {
    // v는 저장 방식의 문제이지 리듀서가 알 일이 아니다
    const result = normalizeOverlay({
      created: [],
      updated: {},
      deleted: [],
      v: OVERLAY_VERSION,
    });

    expect(result).toEqual({ created: [], updated: {}, deleted: [] });
  });

  it('null이면 빈 오버레이를 돌려준다', () => {
    expect(normalizeOverlay(null)).toEqual({
      created: [],
      updated: {},
      deleted: [],
    });
  });

  it('필드 타입이 어긋나면 해당 필드만 빈 값으로 대체한다', () => {
    const corrupted = { created: 'not-an-array', updated: [], deleted: null };

    expect(normalizeOverlay(corrupted)).toEqual({
      created: [],
      updated: {},
      deleted: [],
    });
  });

  it('deleted의 원소를 문자열로 정규화한다', () => {
    expect(
      normalizeOverlay({ created: [], updated: {}, deleted: [1, 2] }),
    ).toEqual({
      created: [],
      updated: {},
      deleted: ['1', '2'],
    });
  });
});
