import { Expose, Transform } from 'class-transformer';
import { ItemOptionsDto } from '../req/create-item';

export class FilebrowserItems {
  @Expose({
    name: '_id',
  })
  @Transform(({ value }) => value.toString())
  id: string;

  @Expose()
  name: string;

  @Expose()
  itemType: 'File' | 'Folder';

  @Expose()
  @Transform(({ value }) => (value ? value.toString() : null))
  parentId: string | null;

  @Expose()
  @Transform(({ obj }) => obj.options ?? null)
  options: ItemOptionsDto;

  @Expose()
  @Transform(({ obj }) => obj.json ?? null)
  json: any;

  @Expose()
  @Transform(({ obj }) => obj.schema ?? null)
  schema: any;

  // 에디터 필드 정의 원본(FieldSchema[] 재귀 구조). 레거시 문서는 null
  @Expose()
  @Transform(({ obj }) => obj.fieldDefs ?? null)
  fieldDefs: any;

  @Expose()
  path: string;

  @Expose()
  depth: number;

  @Expose()
  @Transform(({ value }) => value?.toString())
  workspace: string;
}
