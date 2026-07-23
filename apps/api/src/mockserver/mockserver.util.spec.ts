import {
  extractWorkspaceId,
  firstForwardedHost,
  normalizeMockPath,
  paginateArray,
  splitIdSegment,
} from './mockserver.util';

describe('extractWorkspaceId 서브도메인 추출', () => {
  it('정상 호스트에서 workspaceId를 추출한다', () => {
    expect(extractWorkspaceId('ws1abc.myrealm.cloud', 'myrealm.cloud')).toBe(
      'ws1abc',
    );
  });

  it('포트가 붙은 호스트/도메인도 처리한다', () => {
    expect(extractWorkspaceId('ws1abc.localhost:3000', 'localhost:3000')).toBe(
      'ws1abc',
    );
  });

  it('대문자 호스트는 소문자로 정규화한다', () => {
    expect(extractWorkspaceId('WS1ABC.MyRealm.Cloud', 'myrealm.cloud')).toBe(
      'ws1abc',
    );
  });

  it('베이스 도메인 자체(서브도메인 없음)는 null을 반환한다', () => {
    expect(extractWorkspaceId('myrealm.cloud', 'myrealm.cloud')).toBeNull();
  });

  it('다중 레벨 서브도메인은 null을 반환한다', () => {
    expect(extractWorkspaceId('a.b.myrealm.cloud', 'myrealm.cloud')).toBeNull();
  });

  it('호스트 헤더가 없으면 null을 반환한다', () => {
    expect(extractWorkspaceId(undefined, 'myrealm.cloud')).toBeNull();
  });

  it('다른 도메인이면 null을 반환한다', () => {
    expect(extractWorkspaceId('ws1.other.com', 'myrealm.cloud')).toBeNull();
  });
});

describe('normalizeMockPath 경로 정규화', () => {
  it('/api 프리픽스를 제거한다', () => {
    expect(normalizeMockPath('/api/users')).toBe('/users');
  });

  it('/api 단독 요청은 루트(/)로 정규화한다', () => {
    expect(normalizeMockPath('/api')).toBe('/');
  });

  it('트레일링 슬래시를 제거한다', () => {
    expect(normalizeMockPath('/api/users/')).toBe('/users');
  });

  it('퍼센트 인코딩된 한글 경로를 디코딩한다', () => {
    expect(normalizeMockPath('/api/%ED%9A%8C%EC%9B%90')).toBe('/회원');
  });
});

describe('splitIdSegment 마지막 세그먼트 분리', () => {
  it('/users/3을 부모 경로와 id로 분리한다', () => {
    expect(splitIdSegment('/users/3')).toEqual({
      parentPath: '/users',
      id: '3',
    });
  });

  it('중첩 경로 /folder/users/9도 분리한다', () => {
    expect(splitIdSegment('/folder/users/9')).toEqual({
      parentPath: '/folder/users',
      id: '9',
    });
  });

  it('단일 세그먼트(/users)는 null을 반환한다', () => {
    expect(splitIdSegment('/users')).toBeNull();
  });
});

describe('paginateArray 페이지네이션', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  it('기본 파라미터(page/limit)로 첫 페이지를 반환한다', () => {
    const result = paginateArray(rows, {}, undefined);
    expect(result.data).toHaveLength(10);
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('커스텀 파라미터명(p/size)을 읽는다', () => {
    const result = paginateArray(
      rows,
      { p: '2', size: '5' },
      { pageParam: 'p', limitParam: 'size' },
    );
    expect(result.data[0]).toEqual({ id: 6 });
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });

  it('마지막 페이지는 hasNext가 false다', () => {
    const result = paginateArray(rows, { page: '3' }, undefined);
    expect(result.data).toHaveLength(5);
    expect(result.meta.hasNext).toBe(false);
    expect(result.meta.hasPrev).toBe(true);
  });

  it('잘못된 쿼리값은 기본값으로 처리한다', () => {
    const result = paginateArray(rows, { page: 'abc', limit: '-5' }, undefined);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(1); // -5 → 하한 1로 클램프
  });

  it('limit 상한(100)을 초과하면 100으로 클램프한다', () => {
    const result = paginateArray(rows, { limit: '9999' }, undefined);
    expect(result.meta.limit).toBe(100);
  });
});

describe('firstForwardedHost 프록시 헤더 정규화', () => {
  it('단일 값은 그대로 반환한다', () => {
    expect(firstForwardedHost('ws1.myrealm.cloud')).toBe('ws1.myrealm.cloud');
  });

  it('콤마로 결합된 값은 첫 번째(클라이언트) 값을 취한다', () => {
    expect(firstForwardedHost('ws1.myrealm.cloud, edge-proxy')).toBe(
      'ws1.myrealm.cloud',
    );
  });

  it('배열이면 첫 번째 요소를 취한다', () => {
    expect(firstForwardedHost(['ws1.myrealm.cloud', 'edge-proxy'])).toBe(
      'ws1.myrealm.cloud',
    );
  });

  it('빈 값/undefined는 undefined를 반환한다', () => {
    expect(firstForwardedHost(undefined)).toBeUndefined();
    expect(firstForwardedHost('')).toBeUndefined();
    expect(firstForwardedHost('   ')).toBeUndefined();
  });
});
