import type { FieldSchema } from '@workspace/types';
import {
  validateMockBody,
  resolveValidationFields,
} from './mock-body-validator.util';

describe('Mock API Body 검증 (validateMockBody)', () => {
  const sampleFields: FieldSchema[] = [
    { id: '1', name: 'name', type: 'string' },
    { id: '2', name: 'age', type: 'number' },
    { id: '3', name: 'isActive', type: 'boolean' },
    { id: '4', name: 'birthDate', type: 'date' },
    { id: '5', name: 'userId', type: 'uuid' },
    {
      id: '6',
      name: 'profile',
      type: 'object',
      fields: [{ id: '6-1', name: 'bio', type: 'string' }],
    },
    {
      id: '7',
      name: 'tags',
      type: 'array',
      arrayItemType: 'string',
    },
  ];

  describe('공통 거절 규칙', () => {
    it('body가 null, undefined, 비객체(문자열/숫자/불리언/배열)이면 거절한다', () => {
      expect(validateMockBody(null, sampleFields, 'post').ok).toBe(false);
      expect(validateMockBody(undefined, sampleFields, 'post').ok).toBe(false);
      expect(validateMockBody('text', sampleFields, 'post').ok).toBe(false);
      expect(validateMockBody(123, sampleFields, 'post').ok).toBe(false);
      expect(validateMockBody([1, 2, 3], sampleFields, 'post').ok).toBe(false);
    });

    it('body가 빈 객체({})이면 거절한다', () => {
      expect(validateMockBody({}, sampleFields, 'post').ok).toBe(false);
      expect(validateMockBody({}, sampleFields, 'put').ok).toBe(false);
      expect(validateMockBody({}, sampleFields, 'patch').ok).toBe(false);
    });

    it('최상위에 id 필드가 포함되어 있으면 거절한다', () => {
      const bodyWithId = {
        id: 99,
        name: 'Kim',
        age: 20,
        isActive: true,
        birthDate: '2026-01-01',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        profile: { bio: 'hi' },
        tags: ['a'],
      };
      const res = validateMockBody(bodyWithId, sampleFields, 'post');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('id');
    });

    it('정의되지 않은 필드(추가 필드)가 포함되어 있으면 거절한다', () => {
      const bodyWithExtra = {
        name: 'Kim',
        age: 20,
        isActive: true,
        birthDate: '2026-01-01',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        profile: { bio: 'hi' },
        tags: ['a'],
        extraField: 'hack',
      };
      const res = validateMockBody(bodyWithExtra, sampleFields, 'post');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('extraField');
    });
  });

  describe('타입 검증 규칙', () => {
    const baseValid = {
      name: 'Kim',
      age: 20,
      isActive: true,
      birthDate: '2026-08-30T00:00:00.000Z',
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      profile: { bio: 'hello' },
      tags: ['dev', 'mock'],
    };

    it('모든 타입이 일치하면 POST 성공한다', () => {
      expect(validateMockBody(baseValid, sampleFields, 'post').ok).toBe(true);
    });

    it('string 필드에 숫자가 들어오면 거절한다', () => {
      const res = validateMockBody(
        { ...baseValid, name: 123 },
        sampleFields,
        'post',
      );
      expect(res.ok).toBe(false);
      expect(res.message).toContain('name');
    });

    it('number 필드에 NaN/Infinity 또는 문자열이 들어오면 거절한다', () => {
      expect(
        validateMockBody({ ...baseValid, age: '20' }, sampleFields, 'post').ok,
      ).toBe(false);
      expect(
        validateMockBody({ ...baseValid, age: NaN }, sampleFields, 'post').ok,
      ).toBe(false);
      expect(
        validateMockBody({ ...baseValid, age: Infinity }, sampleFields, 'post')
          .ok,
      ).toBe(false);
    });

    it('boolean 필드에 다른 타입이 들어오면 거절한다', () => {
      expect(
        validateMockBody(
          { ...baseValid, isActive: 'true' },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
    });

    it('date 필드에 유효하지 않은 날짜 문자열이 들어오면 거절한다', () => {
      expect(
        validateMockBody(
          { ...baseValid, birthDate: 'invalid-date' },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
    });

    it('uuid 필드에 형식이 어긋난 문자열이 들어오면 거절한다', () => {
      expect(
        validateMockBody(
          { ...baseValid, userId: 'not-a-uuid' },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
    });

    it('object 필드에 배열이나 비객체가 들어오거나 내부 필드 타입이 틀리면 거절한다', () => {
      expect(
        validateMockBody(
          { ...baseValid, profile: 'not-object' },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
      expect(
        validateMockBody(
          { ...baseValid, profile: { bio: 123 } },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
      expect(
        validateMockBody(
          { ...baseValid, profile: { bio: 'hi', extra: 1 } },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
    });

    it('array 필드에 비배열이나 잘못된 원소 타입이 들어오면 거절한다', () => {
      expect(
        validateMockBody(
          { ...baseValid, tags: 'single' },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
      expect(
        validateMockBody(
          { ...baseValid, tags: ['dev', 123] },
          sampleFields,
          'post',
        ).ok,
      ).toBe(false);
    });
  });

  describe('HTTP 메서드별 요구사항 (POST vs PUT vs PATCH)', () => {
    const validFull = {
      name: 'Kim',
      age: 20,
      isActive: true,
      birthDate: '2026-08-30T00:00:00.000Z',
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      profile: { bio: 'hello' },
      tags: ['dev'],
    };

    it('POST: 스키마 필드가 하나라도 누락되면 거절한다', () => {
      const { name, ...missingName } = validFull;
      const res = validateMockBody(missingName, sampleFields, 'post');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('name');
    });

    it('PUT: 스키마 필드가 하나라도 누락되면 거절한다', () => {
      const { age, ...missingAge } = validFull;
      const res = validateMockBody(missingAge, sampleFields, 'put');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('age');
    });

    it('PATCH: 정의된 필드 중 1개 이상만 유효하게 전달되면 통과한다', () => {
      expect(
        validateMockBody({ name: 'Lee' }, sampleFields, 'patch').ok,
      ).toBe(true);
      expect(
        validateMockBody({ age: 30, isActive: false }, sampleFields, 'patch')
          .ok,
      ).toBe(true);
    });

    it('PATCH: 빈 객체이거나 스키마 외 필드만 있으면 거절한다', () => {
      expect(validateMockBody({}, sampleFields, 'patch').ok).toBe(false);
      expect(
        validateMockBody({ unknownKey: 'val' }, sampleFields, 'patch').ok,
      ).toBe(false);
    });
  });

  describe('resolveValidationFields (fieldDefs 우선, schema 폴백)', () => {
    it('fieldDefs가 있으면 fieldDefs를 우선 사용하고 id 필드를 제외한다', () => {
      const fields: FieldSchema[] = [
        { id: '1', name: 'id', type: 'number' },
        { id: '2', name: 'title', type: 'string' },
      ];
      const resolved = resolveValidationFields(fields, null);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.name).toBe('title');
    });

    it('fieldDefs가 없으면 schema를 변환하여 사용하고 id 필드를 제외한다', () => {
      const schema = {
        id: 'number',
        title: 'string',
        viewCount: 'number',
      };
      const resolved = resolveValidationFields(null, schema);
      expect(resolved.map((f) => f.name).sort()).toEqual([
        'title',
        'viewCount',
      ]);
    });

    it('fieldDefs와 schema가 모두 없거나 입력 필드가 없으면 빈 배열을 반환한다', () => {
      expect(resolveValidationFields(null, null)).toEqual([]);
      expect(resolveValidationFields([], {})).toEqual([]);
    });
  });
});
