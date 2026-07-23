import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MoveItemsDto {
  // 웹은 URL 파라미터로만 보낸다 — 컨트롤러가 URL 값으로 덮어쓰므로 선택 필드
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsArray()
  @IsNotEmpty()
  dragIds: string[];

  @IsString()
  @IsOptional()
  parentId: string | null;
}
