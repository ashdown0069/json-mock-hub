import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { collectDuplicateFieldNames } from '@workspace/types';

/**
 * fieldDefs 트리에서 같은 부모 아래 필드명이 겹치는지 검사한다.
 *
 * 판정 규칙(trim·대소문자 구분·형제 스코프·빈 이름 제외)은 @workspace/types가
 * 단독 소유한다 — 여기서 다시 구현하면 웹 UI는 통과시키고 서버는 거부하는
 * 조용한 불일치가 생긴다.
 *
 * 값이 배열이 아닌 경우는 @IsArray()의 책임이므로 여기서는 통과시킨다.
 */
export function IsUniqueFieldNames(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUniqueFieldNames',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return true;
          return collectDuplicateFieldNames(value).length === 0;
        },
        defaultMessage(args: ValidationArguments) {
          const duplicates = Array.isArray(args.value)
            ? collectDuplicateFieldNames(args.value)
            : [];
          return `같은 위치에 중복된 필드명이 있습니다: ${duplicates.join(', ')}`;
        },
      },
    });
  };
}
