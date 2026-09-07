import { nanoid } from 'nanoid';

export type Row = Record<string, unknown>;

export interface CollectionOverlay {
  created: Row[];
  updated: Record<string, Row>;
  deleted: string[];
  /**
   * 단일 객체 리소스의 상태:
   * - undefined: 변경 없음 (DB baseJson 사용)
   * - Row: POST/PUT/PATCH로 갱신된 실효본
   * - null: DELETE로 비워진 상태 (빈 객체 {} 사용)
   */
  singleton?: Row | null;
}

/** 매 호출마다 새로운 빈 오버레이를 만든다(공유 참조 오염 방지). */
export function createEmptyOverlay(): CollectionOverlay {
  return { created: [], updated: {}, deleted: [] };
}

/**
 * 저장소에서 읽은 값을 CollectionOverlay 불변식에 맞게 기본 형태를 보정한다.
 *
 * 필드가 없거나 타입이 어긋난 값을 안전한 빈 값으로 대체한다. 보정하지
 * 않으면 applyOverlay가 overlay.deleted.map에서 TypeError로 죽는다.
 */
export function normalizeOverlay(value: unknown): CollectionOverlay {
  const raw = (
    typeof value === 'object' && value !== null ? value : {}
  ) as Partial<CollectionOverlay>;

  const deleted = Array.isArray(raw.deleted) ? raw.deleted.map(String) : [];

  const created = (Array.isArray(raw.created) ? raw.created : []).filter(
    (row): row is Row => typeof row === 'object' && row !== null,
  );

  const updated =
    typeof raw.updated === 'object' &&
    raw.updated !== null &&
    !Array.isArray(raw.updated)
      ? (raw.updated as Record<string, Row>)
      : {};

  const singleton =
    typeof raw.singleton === 'object' &&
    raw.singleton !== null &&
    !Array.isArray(raw.singleton)
      ? (raw.singleton as Row)
      : raw.singleton === null
        ? null
        : undefined;

  return { created, updated, deleted, singleton };
}

/**
 * 단일 객체(Singleton/Object) 리소스의 실효본을 반환한다.
 * - singleton이 null이면 DELETE로 비워진 상태이므로 {} 반환
 * - singleton이 Row 객체이면 갱신된 실효본 반환
 * - singleton이 undefined이면 DB의 원본 base 객체 반환
 */
export function applyObjectOverlay(base: Row, overlay: CollectionOverlay): Row {
  if (overlay.singleton === null) return {};
  return overlay.singleton !== undefined ? overlay.singleton : base;
}

/**
 * 단일 객체 리소스에 대한 쓰기(POST/PUT/PATCH)를 오버레이에 반영한다.
 * - post/put: 본문 전체로 실효본 교체
 * - patch: 기존 실효본에 본문 필드 병합
 */
export function applyObjectUpdate(
  current: CollectionOverlay,
  base: Row,
  body: Row,
  mode: 'post' | 'put' | 'patch',
): { overlay: CollectionOverlay; updated: Row } {
  const active = applyObjectOverlay(base, current);
  const updated = mode === 'patch' ? { ...active, ...body } : { ...body };

  return {
    overlay: {
      ...current,
      singleton: updated,
    },
    updated,
  };
}

/**
 * 단일 객체 리소스를 비우는(DELETE) 상태를 오버레이에 반영한다 (singleton: null).
 */
export function applyObjectReset(current: CollectionOverlay): {
  overlay: CollectionOverlay;
  cleared: Row;
} {
  return {
    overlay: {
      ...current,
      singleton: null,
    },
    cleared: {},
  };
}

/**
 * base 컬렉션에 오버레이를 병합해 실효 컬렉션을 만든다.
 *
 * 우선순위: updated(교체) > created(추가), deleted는 **base 행에만** 적용된다.
 * base 순서를 유지하고 created는 뒤에 붙인다.
 *
 * deleted를 created에 적용하지 않는 것이 핵심이다. 적용하면 base에서 지운 id를
 * 재사용해 만든 행이 사라진다(applyDelete가 생성 행을 deleted에 넣지 않으므로
 * created의 id가 deleted에 있는 경우는 정상 경로에서 발생하지 않는다).
 */
export function applyOverlay(base: unknown[], overlay: CollectionOverlay): Row[] {
  const deleted = new Set(overlay.deleted.map(String));
  const overrideById = new Map<string, Row>();
  for (const row of overlay.created) overrideById.set(String(row.id), row);
  for (const [id, row] of Object.entries(overlay.updated)) overrideById.set(id, row);

  const seen = new Set<string>();
  const out: Row[] = [];

  const baseRows = (Array.isArray(base) ? base : []).filter(
    (r): r is Row => typeof r === 'object' && r !== null,
  );
  for (const row of baseRows) {
    const id = String(row.id);
    if (deleted.has(id)) continue;
    out.push(overrideById.has(id) ? overrideById.get(id)! : row);
    seen.add(id);
  }
  // deleted는 base 행 전용 블록리스트다(위 JSDoc 참조).
  // created에까지 적용하면 base에서 지운 id를 재발급받은 행이 즉시 걸러져
  // 201 Created를 주고도 GET에는 나타나지 않는 상태가 된다.
  for (const row of overlay.created) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    out.push(overrideById.get(id)!);
    seen.add(id);
  }
  return out;
}

/** 실효 컬렉션의 id가 모두 숫자면 최댓값+1, 아니면 nanoid 문자열을 반환한다. */
export function computeNextId(effective: Row[]): string | number {
  const ids = effective.map((r) => r.id);
  const allNumeric =
    ids.length > 0 &&
    ids.every(
      (id) =>
        (typeof id === 'number' && Number.isFinite(id)) ||
        (typeof id === 'string' && id.trim() !== '' && Number.isFinite(Number(id))),
    );
  if (ids.length === 0) return 1;
  if (allNumeric) {
    // Math.max(...ids) 스프레드는 인자 수 상한(~12만)에 걸려 RangeError로 죽는다.
    // base json은 사용자가 업로드하므로 행 수에 상한이 없다.
    const max = ids.reduce<number>((acc, id) => {
      const value = Number(id);
      return value > acc ? value : acc;
    }, Number(ids[0]));
    return max + 1;
  }
  return nanoid();
}

/**
 * 한 컬렉션의 오버레이가 보관하는 최대 생성 행 수.
 *
 * mock 경로는 미인증·공개 엔드포인트다(가드 없음, origin '*'). 상한이 없으면
 * 임의 클라이언트의 POST 반복이 Redis 값을 무한히 늘리고, 매 요청이 값 전체를
 * 직렬화/역직렬화하므로 누적 I/O가 O(N²)이 된다.
 */
export const MAX_OVERLAY_CREATED_ROWS = 500;

export type ApplyCreateResult =
  | { ok: true; overlay: CollectionOverlay; created: Row }
  | { ok: false; reason: 'limit' | 'conflict' };

export function applyCreate(
  overlay: CollectionOverlay,
  base: unknown[],
  body: Row,
): ApplyCreateResult {
  // 가장 오래된 행을 조용히 버리면 201을 주면서 데이터를 잃는다.
  // 목서버는 계약 검증 도구이므로 실패를 드러낸다.
  if (overlay.created.length >= MAX_OVERLAY_CREATED_ROWS) {
    return { ok: false, reason: 'limit' };
  }

  // 호출부가 계산한 effective를 받으면 락 밖에서 만든 낡은 값이 섞일 수 있다.
  // 불변인 base만 받고 여기서 직접 만든다.
  const effective = applyOverlay(base, overlay);

  // 명시 id가 실효 컬렉션에 이미 있으면 applyOverlay의 override 규칙 때문에
  // 기존 행이 조용히 교체된다. 생성 요청은 교체가 아니므로 거절한다.
  // 반대로 base에서 지운 id는 실효 컬렉션에 없으므로 재사용을 허용한다.
  if (body.id !== undefined && body.id !== null) {
    const requested = String(body.id);
    if (effective.some((row) => String(row.id) === requested)) {
      return { ok: false, reason: 'conflict' };
    }
  }

  const id = body.id ?? computeNextId(effective);
  const created: Row = { ...body, id };
  return {
    ok: true,
    overlay: { ...overlay, created: [...overlay.created, created] },
    created,
  };
}

export function applyUpdate(
  overlay: CollectionOverlay,
  base: unknown[],
  id: string,
  body: Row,
  mode: 'put' | 'patch',
): { overlay: CollectionOverlay; updated: Row } | null {
  const effective = applyOverlay(base, overlay);
  const current = effective.find((r) => String(r.id) === id);
  if (!current) return null;
  const updated: Row =
    mode === 'put'
      ? { ...body, id: current.id }
      : { ...current, ...body, id: current.id };
  return {
    overlay: {
      ...overlay,
      updated: { ...overlay.updated, [String(current.id)]: updated },
    },
    updated,
  };
}

export function applyDelete(
  overlay: CollectionOverlay,
  base: unknown[],
  id: string,
): CollectionOverlay | null {
  const effective = applyOverlay(base, overlay);
  const current = effective.find((r) => String(r.id) === id);
  if (!current) return null;
  const key = String(current.id);

  // 오버레이가 만든 행은 base에 없다. deleted에 넣으면 (1) 그 id가 블록리스트에
  // 올라가 재사용이 막히고 (2) created 배열에 그대로 남아 상한 슬롯을 영구히
  // 차지한다. 배열에서 빼는 것이 정확하다.
  const isCreatedRow = overlay.created.some((row) => String(row.id) === key);
  if (isCreatedRow) {
    const nextUpdated = { ...overlay.updated };
    delete nextUpdated[key];
    return {
      ...overlay,
      created: overlay.created.filter((row) => String(row.id) !== key),
      updated: nextUpdated,
    };
  }

  if (overlay.deleted.includes(key)) return overlay;
  return { ...overlay, deleted: [...overlay.deleted, key] };
}
