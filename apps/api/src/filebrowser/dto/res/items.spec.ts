import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { FilebrowserItems } from './items';
import { ItemOptionsDto } from '../req/create-item';

/**
 * 인터셉터와 동일한 옵션으로 변환하는 헬퍼
 * (enableImplicitConversion: true, excludeExtraneousValues: true)
 */
function transformToInstance(data: any): FilebrowserItems {
  return plainToInstance(FilebrowserItems, data, {
    enableImplicitConversion: true,
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
        schema: undefined,
        fieldDefs: undefined,
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
    });
  });

  describe('schema 필드 (타입 정보 구조)', () => {
    it('② schema의 중첩 객체가 보존되어야 한다', () => {
      // schema가 타입/제약 정보를 담으면서 구조가 보존되어야 함
      const plainData = {
        _id: 'item-2',
        name: 'schema-item',
        itemType: 'File' as const,
        parentId: null,
        options: undefined,
        json: undefined,
        schema: {
          tags: {
            type: 'array',
            items: 'string',
          },
          properties: {
            name: {
              type: 'string',
              required: true,
            },
          },
        },
        fieldDefs: undefined,
        path: '/schema-test',
        depth: 0,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);

      // schema가 빈 객체 {}가 아니어야 하고, 전체 구조가 보존되어야 함
      expect(result.schema).not.toEqual({});
      expect(result.schema).toEqual(plainData.schema);
      expect(result.schema.tags.type).toBe('array');
      expect(result.schema.properties.name.type).toBe('string');
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
        schema: undefined,
        fieldDefs: undefined,
        path: '/options-test',
        depth: 1,
        workspace: 'workspace-2',
      };

      const result = transformToInstance(plainData);

      // options가 빈 객체 {}가 아니어야 하고, 속성들이 보존되어야 함
      expect(result.options).not.toEqual({});
      expect(result.options.pagination).toBe(true);
      expect(result.options.paginationParams).toBeDefined();
      expect(result.options.paginationParams.pageParam).toBe('page');
      expect(result.options.paginationParams.limitParam).toBe('limit');
    });
  });

  describe('fieldDefs 필드 (새로운 필드)', () => {
    it('④ fieldDefs의 재귀 구조가 보존되어야 한다', () => {
      // fieldDefs는 FieldSchema[] 재귀 구조
      const plainData = {
        _id: 'item-4',
        name: 'fielddefs-item',
        itemType: 'File' as const,
        parentId: null,
        options: undefined,
        json: undefined,
        schema: undefined,
        fieldDefs: [
          {
            name: 'field1',
            type: 'string',
            label: 'Field 1',
            children: [
              {
                name: 'subfield1',
                type: 'number',
                label: 'Sub Field 1',
              },
            ],
          },
          {
            name: 'field2',
            type: 'object',
            label: 'Field 2',
          },
        ],
        path: '/fielddefs-test',
        depth: 0,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);

      // fieldDefs이 null이 아니어야 하고, 재귀 구조가 보존되어야 함
      expect(result.fieldDefs).not.toBeNull();
      expect(result.fieldDefs).toEqual(plainData.fieldDefs);
      expect(result.fieldDefs).toHaveLength(2);
      expect(result.fieldDefs[0].children).toHaveLength(1);
      expect(result.fieldDefs[0].children[0].name).toBe('subfield1');
    });
  });

  describe('fieldDefs 필드 (레거시 문서)', () => {
    it('⑤ fieldDefs가 없으면 null이어야 한다', () => {
      // 레거시 문서는 fieldDefs가 없음
      const plainData = {
        _id: 'item-5',
        name: 'legacy-item',
        itemType: 'File' as const,
        parentId: null,
        options: undefined,
        json: undefined,
        schema: undefined,
        // fieldDefs 없음
        path: '/legacy-test',
        depth: 0,
        workspace: 'workspace-1',
      };

      const result = transformToInstance(plainData);

      // fieldDefs이 null이어야 함
      expect(result.fieldDefs).toBeNull();
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
        schema: { type: 'object' },
        fieldDefs: null,
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
      expect(result.options.pagination).toBe(true);
      expect(result.json.test).toBe('data');
      expect(result.schema.type).toBe('object');
    });
  });
});
