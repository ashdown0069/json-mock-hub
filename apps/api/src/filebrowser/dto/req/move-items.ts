import { ArrayNotEmpty, IsArray, IsMongoId, IsOptional } from 'class-validator';

export class MoveItemsDto {
  // 웹은 URL 파라미터로만 보낸다 — 컨트롤러가 URL 값으로 덮어쓰므로 선택 필드
  @IsMongoId()
  @IsOptional()
  workspaceId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  dragIds: string[];

  // @IsOptional()은 null도 건너뛰므로 "루트로 이동"(null)이 그대로 통과한다
  @IsMongoId()
  @IsOptional()
  parentId: string | null;
}
