import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * 같은 DTO 안의 다른 프로퍼티와 값이 일치하는지 검사한다 (예: passwordConfirm ↔ password).
 * 대상 프로퍼티가 undefined면 이 검증도 undefined와 비교하므로,
 * 선택 필드에는 @IsOptional()을 함께 붙여야 한다.
 */
export function MatchesProperty(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'matchesProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const related = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === related;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property}이(가) ${relatedPropertyName}과(와) 일치하지 않습니다.`;
        },
      },
    });
  };
}
