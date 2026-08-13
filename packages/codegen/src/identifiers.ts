/**
 * 아이템 이름(한글/영문/숫자/하이픈/언더바)을 JS 식별자로 변환합니다.
 * 한글은 유효한 JS 식별자 문자이므로 유지하고, 하이픈 등 무효 문자만 '_'로 치환합니다.
 */
export function toIdentifier(name: string): string {
  const replaced = name.replace(/[^\p{L}\p{N}_$]/gu, "_")
  if (!replaced) return "_"
  return /^\p{N}/u.test(replaced) ? `_${replaced}` : replaced
}

/** 언더바 구분 식별자를 PascalCase로 변환합니다 (예: my_api -> MyApi) */
export function toPascalCase(identifier: string): string {
  const pascal = identifier
    .split("_")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join("")
  return pascal || "_"
}

/** 객체 리터럴/인터페이스 키가 유효한 식별자가 아니면 따옴표로 감쌉니다. */
export function formatObjectKey(key: string): string {
  return /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(key) ? key : JSON.stringify(key)
}

/**
 * 임의 문자열을 JS 문자열 리터럴(따옴표 포함)로 안전하게 변환합니다.
 * 생성 코드에 원문을 그대로 박으면 따옴표 하나로 리터럴을 탈출해 임의 구문을 삽입할 수 있습니다.
 */
export const quoteLiteral = (s: string): string => JSON.stringify(s)

/**
 * 임의 문자열을 템플릿 리터럴(백틱) 안에 안전하게 삽입할 수 있게 이스케이프합니다.
 * ${...}를 막지 않으면 사용자가 생성 코드를 붙여넣는 순간 임의 표현식이 평가됩니다.
 * 백슬래시를 가장 먼저 치환해야 뒤 단계의 결과가 이중 처리되지 않습니다.
 */
export const escapeTemplate = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
