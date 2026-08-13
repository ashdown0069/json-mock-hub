import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ITEM_NAME_REGEX } from './create-item';

export class RenameItemDto {
  // 웹은 URL 파라미터로만 보내고 MCP는 body에도 담는다 — 컨트롤러는 URL 값만 신뢰하므로 선택 필드
  @IsMongoId()
  @IsOptional()
  workspaceId?: string;

  @IsMongoId()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(ITEM_NAME_REGEX, {
    message:
      '이름은 한글, 영문, 숫자, 하이픈(-), 언더바(_)만 사용할 수 있습니다.',
  })
  newName: string;
}
