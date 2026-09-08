import { Expose, Transform } from 'class-transformer';
import type {
  FileBrowserItemContract,
  FieldSchema,
  MockApiOptions,
} from '@workspace/types';

export class FilebrowserItems implements FileBrowserItemContract {
  // class-transformer(0.5.1)는 @Type() 없이 ObjectId처럼 "인자 없는 생성자 호출에
  // 부작용이 있는" 값을 변환할 때, new value.constructor()로 새 인스턴스를 만들어
  // 복제하려 시도한다(Date/Buffer는 예외 처리되지만 ObjectId는 아니다). 그 결과
  // @Transform(({ value }) => ...)의 value는 원본이 아닌 별개의 새 ObjectId가 되어
  // id/parentId/workspace가 실제 저장값과 달라지는 회귀가 있었다. obj(원본 소스
  // 객체)에서 직접 읽으면 이 재귀 변환 경로를 타지 않아 원본 값을 그대로 얻는다.
  @Expose({
    name: '_id',
  })
  @Transform(({ obj }) => obj._id.toString())
  id: string;

  @Expose()
  name: string;

  @Expose()
  itemType: 'File' | 'Folder';

  @Expose()
  @Transform(({ obj }) => (obj.parentId ? obj.parentId.toString() : null))
  parentId: string | null;

  @Expose()
  @Transform(({ obj }) => obj.options ?? null)
  options: MockApiOptions | null;

  @Expose()
  @Transform(({ obj }) => obj.json ?? null)
  json: any;

  @Expose()
  @Transform(({ obj }) => obj.fields ?? null)
  fields: FieldSchema[] | null;

  @Expose()
  path: string;

  @Expose()
  depth: number;

  @Expose()
  @Transform(({ obj }) => (obj.workspace ? obj.workspace.toString() : null))
  workspace: string;
}

// 컴파일 타임 계약 검사 — DTO가 공유 계약에서 필드를 빠뜨리거나 타입이 어긋나면
// 여기서 컴파일이 깨진다.
type AssertContract = FilebrowserItems extends FileBrowserItemContract
  ? true
  : never;
const _assertItemsContract: AssertContract = true;
void _assertItemsContract;
