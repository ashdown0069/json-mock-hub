import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { FilebrowserItems } from './items';

/**
 * 인터셉터와 동일한 옵션으로 변환하는 헬퍼
 * (excludeExtraneousValues: true)
 *
 * enableImplicitConversion은 쓰지 않는다: 유니온 타입 필드(parentId: string | null)의
 * design:type이 Object로 리플렉트되어, Transform 실행 전에 ObjectId가 plain object로
 * 벗겨지며 "[object Object]"가 되는 버그가 있었다.
 */
function transformToInstance(data: any): FilebrowserItems {
  return plainToInstance(FilebrowserItems, data, {
    excludeExtraneousValues: true,
  });
}

describe('FilebrowserItems 직렬화 (Serialize)', () => {
  describe('json 필드 (중첩 객체)', () => {
    it('① json의 중첩 객체가 deep-equal로 보존되어야 한다', () => {
      // json의 중첩 구조가 보존되는지 검증
      const plainData = {
        _id: 'item-1',
        name: 'test-item',
        itemType: 'File' as const,
        parentId: 'parent-1',
        options: undefined,
        json: {
          records: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
          metadata: {
            total: 2,
            nested: {
              deep: {
                value: 'preserved',
              },
            },
          },
        },
        fields: undefined,
        path: '/test',
        depth: 1,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);

      // json이 빈 객체 {}가 아니어야 하고, 중첩 구조가 보존되어야 함
      expect(result.json).not.toEqual({});
      expect(result.json).toEqual(plainData.json);
      expect(result.json.records).toHaveLength(2);
      expect(result.json.metadata.nested.deep.value).toBe('preserved');
      // 과거 레거시 필드(schema, fieldDefs)가 응답 객체에 유출되지 않도록 회귀 방지(Regression Guard)
      expect(result).not.toHaveProperty('schema');
      expect(result).not.toHaveProperty('fieldDefs');
    });
  });

  describe('fields 필드 (FieldSchema[] 단일 모델)', () => {
    it('② fields의 재귀 구조가 보존되어야 하고 schema/fieldDefs는 노출되지 않는다', () => {
      const plainData = {
        _id: 'item-2',
        name: 'fields-item',
        itemType: 'File' as const,
        parentId: null,
        options: undefined,
        json: undefined,
        fields: [
          {
            id: 'f1',
            name: 'title',
            type: 'string',
            fakerMethod: 'none',
          },
          {
            id: 'f2',
            name: 'author',
            type: 'object',
            fakerMethod: 'none',
            fields: [
              { id: 'f2-1', name: 'name', type: 'string', fakerMethod: 'none' },
            ],
          },
        ],
        path: '/fields-test',
        depth: 0,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);

      expect(result.fields).not.toBeNull();
      expect(result.fields).toEqual(plainData.fields);
      expect(result.fields).toHaveLength(2);
      expect(result.fields?.[1]?.fields).toHaveLength(1);
      expect(result.fields?.[1]?.fields?.[0]?.name).toBe('name');
      expect(result).not.toHaveProperty('schema');
      expect(result).not.toHaveProperty('fieldDefs');
    });

    it('fields가 null/undefined이면 null이어야 한다', () => {
      const plainData = {
        _id: 'item-null-fields',
        name: 'empty-item',
        itemType: 'File' as const,
        parentId: null,
        options: undefined,
        json: undefined,
        fields: null,
        path: '/empty-test',
        depth: 0,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);
      expect(result.fields).toBeNull();
    });
  });

  describe('options 필드 (ItemOptionsDto)', () => {
    it('③ options의 pagination/paginationParams가 보존되어야 한다', () => {
      // options가 빈 객체로 벗겨지는 버그 검증
      const plainData = {
        _id: 'item-3',
        name: 'options-item',
        itemType: 'Folder' as const,
        parentId: null,
        options: {
          pagination: true,
          paginationParams: {
            pageParam: 'page',
            limitParam: 'limit',
          },
        },
        json: undefined,
        path: '/options-test',
        depth: 1,
        workspace: 'workspace-2',
      };

      const result = transformToInstance(plainData);

      // options가 빈 객체 {}가 아니어야 하고, 속성들이 보존되어야 함
      expect(result.options).not.toEqual({});
      expect(result.options?.pagination).toBe(true);
      expect(result.options?.paginationParams).toBeDefined();
      expect(result.options?.paginationParams?.pageParam).toBe('page');
      expect(result.options?.paginationParams?.limitParam).toBe('limit');
    });

    it('options의 sort/search 설정이 응답에서 보존되어야 한다', () => {
      const doc = {
        _id: new Types.ObjectId(),
        name: 'query-options-item',
        itemType: 'File' as const,
        parentId: null,
        options: {
          pagination: false,
          sort: true,
          sortParams: { sortParam: 'orderBy', orderParam: 'direction' },
          search: true,
          searchParams: { searchParam: 'keyword' },
        },
        path: '/query-options-test',
        depth: 0,
        workspace: new Types.ObjectId(),
      };
      const result = plainToInstance(FilebrowserItems, doc, {
        excludeExtraneousValues: true,
      });
      expect(result.options?.sort).toBe(true);
      expect(result.options?.sortParams?.sortParam).toBe('orderBy');
      expect(result.options?.sortParams?.orderParam).toBe('direction');
      expect(result.options?.search).toBe(true);
      expect(result.options?.searchParams?.searchParam).toBe('keyword');
    });
  });



  describe('회귀: _id→id 변환 및 내부 필드 제외', () => {
    it('⑥ _id→id 변환이 유지되고, _id/__v가 미노출되어야 한다', () => {
      // _id가 id로 변환되고, _id와 __v는 노출되지 않아야 함 (기존 동작 회귀)
      const plainData = {
        _id: new (require('mongodb').ObjectId)(),
        name: 'regression-item',
        itemType: 'File' as const,
        parentId: null,
        options: {
          pagination: true,
        },
        json: { test: 'data' },
        fields: [{ id: 'f-1', name: 'id', type: 'number' }],
        path: '/regression-test',
        depth: 0,
        workspace: 'workspace-1',
        __v: 0, // 이 필드는 노출되지 않아야 함
      };

      const result = transformToInstance(plainData);

      // _id가 id (문자열)로 변환되어야 함
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      // _id와 __v는 노출되지 않아야 함
      expect((result as any)._id).toBeUndefined();
      expect((result as any).__v).toBeUndefined();

      // 다른 필드들은 정상 보존
      expect(result.options?.pagination).toBe(true);
      expect(result.json.test).toBe('data');
      expect(result.fields).toBeDefined();
      expect(result).not.toHaveProperty('schema');
      expect(result).not.toHaveProperty('fieldDefs');
    });
  });

  describe('회귀: parentId가 실제 ObjectId 인스턴스일 때', () => {
    it('⑦ parentId가 "[object Object]"가 아니라 hex 문자열로 변환되어야 한다', () => {
      // parentId는 string | null 유니온 타입이라 enableImplicitConversion이 켜져 있으면
      // design:type이 Object로 리플렉트되어 ObjectId가 toString() 전에 벗겨지는 버그가 있었다.
      const parentObjectId = new Types.ObjectId();
      const plainData = {
        _id: new Types.ObjectId(),
        name: 'child-item',
        itemType: 'File' as const,
        parentId: parentObjectId,
        options: undefined,
        json: undefined,
        path: '/parent/child-item',
        depth: 1,
        workspace: new Types.ObjectId(),
      };

      const result = transformToInstance(plainData);

      expect(result.parentId).toBe(parentObjectId.toString());
      expect(result.parentId).not.toBe('[object Object]');
    });
  });

  describe('회귀: id/parentId/workspace는 실제 원본 ObjectId 값과 정확히 일치해야 한다', () => {
    // class-transformer(0.5.1)는 @Type() 없이 ObjectId처럼 "생성자에 부작용이 있는"
    // object를 변환할 때, 내부적으로 new value.constructor()로 새 인스턴스를 만들어
    // 복제하려 시도한다. Date/Buffer는 라이브러리가 예외 처리하지만 ObjectId는 그
    // 목록에 없어, @Transform(({ value }) => value.toString())가 원본이 아닌
    // "새로 생성된 별개의 ObjectId"를 문자열화하는 결과를 낳는다.
    // 단발성으로는 우연히 통과할 수 있어 반복 실행으로 검증한다.
    it('⑧ id가 반복 변환해도 항상 원본 _id.toString()과 같아야 한다', () => {
      for (let i = 0; i < 20; i++) {
        const realId = new Types.ObjectId();
        const result = transformToInstance({
          _id: realId,
          name: 'item',
          itemType: 'File' as const,
          parentId: null,
          path: '/item',
          depth: 0,
          workspace: new Types.ObjectId(),
        });

        expect(result.id).toBe(realId.toString());
      }
    });

    it('⑨ parentId가 반복 변환해도 항상 원본 parentId.toString()과 같아야 한다', () => {
      for (let i = 0; i < 20; i++) {
        const realParentId = new Types.ObjectId();
        const result = transformToInstance({
          _id: new Types.ObjectId(),
          name: 'child',
          itemType: 'File' as const,
          parentId: realParentId,
          path: '/parent/child',
          depth: 1,
          workspace: new Types.ObjectId(),
        });

        expect(result.parentId).toBe(realParentId.toString());
      }
    });

    it('⑩ workspace가 반복 변환해도 항상 원본 workspace.toString()과 같아야 한다', () => {
      for (let i = 0; i < 20; i++) {
        const realWorkspace = new Types.ObjectId();
        const result = transformToInstance({
          _id: new Types.ObjectId(),
          name: 'item',
          itemType: 'Folder' as const,
          parentId: null,
          path: '/item',
          depth: 0,
          workspace: realWorkspace,
        });

        expect(result.workspace).toBe(realWorkspace.toString());
      }
    });

    it('⑪ SerializeInterceptor와 동일하게 배열을 매핑 변환해도 각 아이템의 id가 서로 섞이지 않아야 한다', () => {
      const items = Array.from({ length: 10 }).map((_, i) => ({
        _id: new Types.ObjectId(),
        name: `item-${i}`,
        itemType: 'File' as const,
        parentId: null,
        path: `/item-${i}`,
        depth: 0,
        workspace: new Types.ObjectId(),
      }));

      const results = items.map((item) => transformToInstance(item));

      items.forEach((item, i) => {
        expect(results[i]!.id).toBe(item._id.toString());
      });
    });
  });
});
