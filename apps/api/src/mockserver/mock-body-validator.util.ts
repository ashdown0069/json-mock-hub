import {
  FieldSchema,
  FieldType,
  SchemaPrimitive,
  MAX_SCHEMA_DEPTH,
  isSchemaPrimitive,
} from '@workspace/types';

export type MockWriteMethod = 'post' | 'put' | 'patch';

export interface BodyValidationResult {
  ok: boolean;
  message?: string;
  code?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * ISO-8601 및 유효한 날짜 문자열 검증
 */
function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

/**
 * UUID 형식 검증
 */
function isValidUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * 단일 원시 값 타입 검증
 */
function validatePrimitive(
  value: unknown,
  type: SchemaPrimitive,
  fieldPath: string,
): string | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return `'${fieldPath}' 필드는 string 타입이어야 합니다.`;
      }
      return null;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `'${fieldPath}' 필드는 유효한 number 타입이어야 합니다.`;
      }
      return null;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `'${fieldPath}' 필드는 boolean 타입이어야 합니다.`;
      }
      return null;
    case 'date':
      if (!isValidDate(value)) {
        return `'${fieldPath}' 필드는 유효한 날짜(ISO-8601) 형식이어야 합니다.`;
      }
      return null;
    case 'uuid':
      if (!isValidUuid(value)) {
        return `'${fieldPath}' 필드는 유효한 UUID 형식이어야 합니다.`;
      }
      return null;
    default:
      return null;
  }
}

/**
 * 단일 필드 재귀 검증
 */
function validateFieldValue(
  value: unknown,
  field: FieldSchema,
  fieldPath: string,
  depth = 0,
): string | null {
  if (depth >= MAX_SCHEMA_DEPTH) return null;

  if (field.type === 'object') {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      return `'${fieldPath}' 필드는 객체(object)여야 합니다.`;
    }

    const subObj = value as Record<string, unknown>;
    const subFields = field.fields ?? [];
    const allowedKeys = new Set(subFields.map((f) => f.name));

    // 하위 객체의 스키마 외 필드 검증 (strict)
    for (const key of Object.keys(subObj)) {
      if (!allowedKeys.has(key)) {
        return `'${fieldPath}' 객체에 정의되지 않은 필드 '${key}'가 포함되어 있습니다.`;
      }
    }

    // 하위 객체의 필수 필드 및 타입 검증
    for (const subField of subFields) {
      const subValue = subObj[subField.name];
      if (subValue === undefined) {
        return `'${fieldPath}.${subField.name}' 필드는 필수입니다.`;
      }
      const err = validateFieldValue(
        subValue,
        subField,
        `${fieldPath}.${subField.name}`,
        depth + 1,
      );
      if (err) return err;
    }

    return null;
  }

  if (field.type === 'array') {
    if (!Array.isArray(value)) {
      return `'${fieldPath}' 필드는 배열(array)이어야 합니다.`;
    }

    if (field.fields && field.fields.length > 0) {
      // 객체 배열 검증
      for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return `'${fieldPath}[${i}]' 원소는 객체여야 합니다.`;
        }
        const itemObj = item as Record<string, unknown>;
        const allowedKeys = new Set(field.fields.map((f) => f.name));
        for (const key of Object.keys(itemObj)) {
          if (!allowedKeys.has(key)) {
            return `'${fieldPath}[${i}]' 객체에 정의되지 않은 필드 '${key}'가 포함되어 있습니다.`;
          }
        }
        for (const subField of field.fields) {
          const subValue = itemObj[subField.name];
          if (subValue === undefined) {
            return `'${fieldPath}[${i}].${subField.name}' 필드는 필수입니다.`;
          }
          const err = validateFieldValue(
            subValue,
            subField,
            `${fieldPath}[${i}].${subField.name}`,
            depth + 1,
          );
          if (err) return err;
        }
      }
    } else {
      // 스칼라 원소 배열 검증
      const itemType = field.arrayItemType ?? 'string';
      for (let i = 0; i < value.length; i += 1) {
        const err = validatePrimitive(value[i], itemType, `${fieldPath}[${i}]`);
        if (err) return err;
      }
    }

    return null;
  }

  return validatePrimitive(value, field.type as SchemaPrimitive, fieldPath);
}

/**
 * Record<string, unknown> (FileItem.schema) → FieldSchema[] 변환
 */
function schemaToFieldSchemas(
  schema: Record<string, unknown> | null | undefined,
  depth = 0,
): FieldSchema[] {
  if (!schema || typeof schema !== 'object' || depth >= MAX_SCHEMA_DEPTH) {
    return [];
  }

  return Object.entries(schema).map(([name, value], index) => {
    const id = `${depth}-${index}-${name}`;
    if (typeof value === 'string') {
      return {
        id,
        name,
        type: (isSchemaPrimitive(value) ? value : 'string') as FieldType,
      };
    }

    const v = value as Record<string, unknown>;
    if (v && v.type === 'array' && 'items' in v) {
      const items = v.items;
      const isObjectItems = typeof items === 'object' && items !== null;
      return {
        id,
        name,
        type: 'array',
        fields: isObjectItems
          ? schemaToFieldSchemas(items as Record<string, unknown>, depth + 1)
          : undefined,
        arrayItemType:
          typeof items === 'string' && isSchemaPrimitive(items)
            ? items
            : 'string',
      };
    }

    return {
      id,
      name,
      type: 'object',
      fields: schemaToFieldSchemas(v, depth + 1),
    };
  });
}

/**
 * fieldDefs를 우선하고 schema를 폴백으로 정규화된 검증 대상 필드 목록을 도출한다.
 * 서버 관리 필드인 'id'는 검증 대상에서 제외된다.
 */
export function resolveValidationFields(
  fieldDefs: unknown,
  schema: unknown,
): FieldSchema[] {
  let fields: FieldSchema[] = [];

  if (Array.isArray(fieldDefs) && fieldDefs.length > 0) {
    fields = fieldDefs.filter(
      (f): f is FieldSchema =>
        typeof f === 'object' &&
        f !== null &&
        typeof f.name === 'string' &&
        f.name.trim() !== '',
    );
  } else if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    fields = schemaToFieldSchemas(schema as Record<string, unknown>);
  }

  // 최상위 'id' 필드는 서버 관리 필드이므로 클라이언트 입력 스키마에서 제외한다.
  return fields.filter((f) => f.name.trim() !== 'id');
}

/**
 * Mock API 요청 body의 유효성을 검증한다.
 */
export function validateMockBody(
  body: unknown,
  expectedFields: FieldSchema[],
  method: MockWriteMethod,
): BodyValidationResult {
  // 1. 객체 여부 검증 (null, 배열, 원시값 거절)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      ok: false,
      code: 'mock.invalid_request_body',
      message: '요청 본문은 비어있지 않은 JSON 객체여야 합니다.',
    };
  }

  const bodyObj = body as Record<string, unknown>;
  const keys = Object.keys(bodyObj);

  // 2. 빈 객체 거절
  if (keys.length === 0) {
    return {
      ok: false,
      code: 'mock.invalid_request_body',
      message: '요청 본문이 비어 있습니다.',
    };
  }

  // 3. 클라이언트 최상위 id 필드 거절
  if (bodyObj.id !== undefined) {
    return {
      ok: false,
      code: 'mock.invalid_request_body',
      message:
        "'id' 필드는 서버에서 자동 관리되므로 요청 본문에 포함할 수 없습니다.",
    };
  }

  // 4. 스키마 필드 정의 유효성 검사
  if (expectedFields.length === 0) {
    return {
      ok: false,
      code: 'mock.invalid_request_body',
      message:
        '대상 리소스에 정의된 입력 스키마 필드가 없어 쓰기 요청을 처리할 수 없습니다.',
    };
  }

  const fieldMap = new Map<string, FieldSchema>();
  for (const field of expectedFields) {
    fieldMap.set(field.name, field);
  }

  // 5. 스키마에 없는 초과 필드(Unknown keys) 검증 (strict)
  for (const key of keys) {
    if (!fieldMap.has(key)) {
      return {
        ok: false,
        code: 'mock.invalid_request_body',
        message: `정의되지 않은 필드가 요청에 포함되어 있습니다: '${key}'`,
      };
    }
  }

  // 6. 메서드별 필드 존재성 및 타입 검증
  if (method === 'post' || method === 'put') {
    // POST / PUT은 모든 스키마 필드가 필수
    for (const field of expectedFields) {
      const val = bodyObj[field.name];
      if (val === undefined) {
        return {
          ok: false,
          code: 'mock.invalid_request_body',
          message: `'${field.name}' 필드는 필수입니다.`,
        };
      }
      const typeError = validateFieldValue(val, field, field.name);
      if (typeError) {
        return {
          ok: false,
          code: 'mock.invalid_request_body',
          message: typeError,
        };
      }
    }
  } else if (method === 'patch') {
    // PATCH는 1개 이상의 유효 필드가 필요하며, 제공된 필드만 타입 검증
    let providedCount = 0;
    for (const key of keys) {
      const field = fieldMap.get(key);
      if (field) {
        providedCount += 1;
        const typeError = validateFieldValue(bodyObj[key], field, key);
        if (typeError) {
          return {
            ok: false,
            code: 'mock.invalid_request_body',
            message: typeError,
          };
        }
      }
    }

    if (providedCount === 0) {
      return {
        ok: false,
        code: 'mock.invalid_request_body',
        message:
          '수정할 유효한 스키마 필드가 최소 하나 이상 전달되어야 합니다.',
      };
    }
  }

  return { ok: true };
}
