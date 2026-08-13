import {
  applyCollectionQuery,
  CollectionQueryOptions,
} from './collection-query.util';

const rows = [
  { id: 1, name: 'kim', age: 30 },
  { id: 2, name: 'lee', age: 20 },
  { id: 3, name: 'park', age: 25 },
];

const off: CollectionQueryOptions = { sort: null, search: null };
const sortOn: CollectionQueryOptions = {
  sort: { sortParam: '_sort', orderParam: '_order' },
  search: null,
};
const searchOn: CollectionQueryOptions = {
  sort: null,
  search: { searchParam: 'q' },
};

describe('applyCollectionQuery', () => {
  describe('정렬 (opt-in)', () => {
    it('정렬 활성화 시 _sort 필드 기준 오름차순으로 정렬한다', () => {
      const result = applyCollectionQuery(rows, { _sort: 'age' }, sortOn);
      expect(result.map((r) => r.age)).toEqual([20, 25, 30]);
    });

    it('_order=desc면 내림차순으로 정렬한다', () => {
      const result = applyCollectionQuery(
        rows,
        { _sort: 'age', _order: 'desc' },
        sortOn,
      );
      expect(result.map((r) => r.age)).toEqual([30, 25, 20]);
    });

    it('커스텀 파라미터명(orderBy/direction)을 설정하면 그 이름으로 동작한다', () => {
      const custom: CollectionQueryOptions = {
        sort: { sortParam: 'orderBy', orderParam: 'direction' },
        search: null,
      };
      const result = applyCollectionQuery(
        rows,
        { orderBy: 'age', direction: 'desc' },
        custom,
      );
      expect(result.map((r) => r.age)).toEqual([30, 25, 20]);
    });

    it('정렬 비활성화면 _sort 파라미터가 있어도 원본 순서를 유지한다', () => {
      const result = applyCollectionQuery(rows, { _sort: 'age' }, off);
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('원본 배열을 변형하지 않는다', () => {
      const original = [...rows];
      applyCollectionQuery(rows, { _sort: 'age' }, sortOn);
      expect(rows).toEqual(original);
    });
  });

  describe('전문검색 (opt-in)', () => {
    it('검색 활성화 시 q 값을 포함하는 행만 반환한다', () => {
      const result = applyCollectionQuery(rows, { q: 'kim' }, searchOn);
      expect(result).toEqual([{ id: 1, name: 'kim', age: 30 }]);
    });

    it('커스텀 검색 파라미터명(keyword)으로도 동작한다', () => {
      const custom: CollectionQueryOptions = {
        sort: null,
        search: { searchParam: 'keyword' },
      };
      const result = applyCollectionQuery(rows, { keyword: 'lee' }, custom);
      expect(result.map((r) => r.name)).toEqual(['lee']);
    });

    it('검색 비활성화면 q 파라미터가 있어도 전체를 반환한다', () => {
      const result = applyCollectionQuery(rows, { q: 'kim' }, off);
      expect(result).toHaveLength(3);
    });

    it('대소문자를 구분하지 않고 부분 일치로 검색한다', () => {
      const result = applyCollectionQuery(rows, { q: 'KIM' }, searchOn);
      expect(result).toHaveLength(1);
    });
  });

  describe('필터 기능 제거', () => {
    it('필드 필터(?name=kim)는 더 이상 동작하지 않고 무시된다', () => {
      const result = applyCollectionQuery(rows, { name: 'kim' }, off);
      expect(result).toHaveLength(3);
    });

    it('연산자 접미사(_gte 등) 파라미터도 무시된다', () => {
      const result = applyCollectionQuery(rows, { age_gte: '25' }, off);
      expect(result).toHaveLength(3);
    });
  });

  describe('엣지 케이스', () => {
    it('배열이 아닌 데이터는 빈 배열을 반환한다', () => {
      expect(applyCollectionQuery('oops' as any, {}, off)).toEqual([]);
    });

    it('객체가 아닌 행은 걸러낸다', () => {
      const mixed = [rows[0], null, 'str', 42];
      expect(applyCollectionQuery(mixed, {}, off)).toEqual([rows[0]]);
    });

    it('배열로 들어온 중복 파라미터는 첫 값을 사용한다', () => {
      const result = applyCollectionQuery(
        rows,
        { _sort: ['age', 'name'] },
        sortOn,
      );
      expect(result.map((r) => r.age)).toEqual([20, 25, 30]);
    });

    it('null / undefined 값이 포함된 숫자 필드 정렬 시 nullish 값을 맨 뒤로 배치한다', () => {
      const dataWithNil = [
        { id: 1, age: 30 },
        { id: 2, age: null },
        { id: 3, age: 10 },
        { id: 4, age: undefined },
        { id: 5, age: 20 },
      ];
      const result = applyCollectionQuery(dataWithNil, { _sort: 'age' }, sortOn);
      expect(result.map((r) => r.id)).toEqual([3, 5, 1, 2, 4]);
    });

    it('null / undefined 속성을 가진 객체에 대해 q="null" 또는 q="undefined" 검색 시 오매칭되지 않는다', () => {
      const dataWithNil = [
        { id: 1, name: 'kim', note: null },
        { id: 2, name: 'null_user', note: 'active' },
        { id: 3, name: 'lee', note: undefined },
      ];
      const resultNull = applyCollectionQuery(
        dataWithNil,
        { q: 'null' },
        searchOn,
      );
      expect(resultNull).toEqual([{ id: 2, name: 'null_user', note: 'active' }]);

      const resultUndefined = applyCollectionQuery(
        dataWithNil,
        { q: 'undefined' },
        searchOn,
      );
      expect(resultUndefined).toEqual([]);
    });

    it('정렬과 검색을 동시에 적용한다 (복합 적용)', () => {
      const comboOn: CollectionQueryOptions = {
        sort: { sortParam: '_sort', orderParam: '_order' },
        search: { searchParam: 'q' },
      };
      const data = [
        { id: 1, name: 'kim developer', score: 80 },
        { id: 2, name: 'lee manager', score: 90 },
        { id: 3, name: 'park developer', score: 95 },
        { id: 4, name: 'choi developer', score: 70 },
      ];
      const result = applyCollectionQuery(
        data,
        { q: 'developer', _sort: 'score', _order: 'desc' },
        comboOn,
      );
      expect(result.map((r) => r.id)).toEqual([3, 1, 4]);
    });

    it('query가 null 또는 undefined인 경우 방어적으로 빈 쿼리로 처리한다', () => {
      expect(() =>
        applyCollectionQuery(rows, null as any, sortOn),
      ).not.toThrow();
      expect(() =>
        applyCollectionQuery(rows, undefined as any, sortOn),
      ).not.toThrow();
    });
  });
});

