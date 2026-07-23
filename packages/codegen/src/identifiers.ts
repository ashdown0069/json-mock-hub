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
