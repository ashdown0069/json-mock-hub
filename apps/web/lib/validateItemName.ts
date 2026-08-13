// API 엔드포인트명 및 파일 트리 노드명에 대한 한글/영문/숫자/하이픈/언더바 검증 정규식
const ITEM_NAME_REGEX = /^[a-zA-Z0-9가-힣_-]+$/

/**
 * 아이템 이름이 허용된 문자 규칙(한글, 영문, 숫자, -, _)에 부합하는지 반환한다.
 * 공백이나 경로 구분자(/)는 포함할 수 없다.
 */
export function isValidItemName(name: string): boolean {
  return ITEM_NAME_REGEX.test(name)
}
