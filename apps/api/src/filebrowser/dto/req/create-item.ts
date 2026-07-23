import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// 프론트(apps/web/lib/validateItemName.ts)와 동일 규칙: 한글/영문/숫자/하이픈/언더바
export const ITEM_NAME_REGEX = /^[a-zA-Z0-9가-힣_-]+$/;

export class PaginationParamsDto {
  @IsString()
  @IsOptional()
  pageParam?: string;

  @IsString()
  @IsOptional()
  limitParam?: string;
}

export class ItemOptionsDto {
  @IsBoolean()
  @IsOptional()
  pagination?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationParamsDto)
  paginationParams?: PaginationParamsDto;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ITEM_NAME_REGEX, {
    message:
      '이름은 한글, 영문, 숫자, 하이픈(-), 언더바(_)만 사용할 수 있습니다.',
  })
  name: string;

  @IsIn(['File', 'Folder'])
  @IsNotEmpty()
  itemType: 'File' | 'Folder';

  @ValidateIf((o) => o.parentId !== null) // parentId가 null이 아닐 때만 아래 검사(IsString)를 진행함
  @IsString()
  parentId: string | null;

  @IsOptional()
  @IsObject()
  schema?: Record<string, any>;

  @IsOptional()
  json?: any;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ItemOptionsDto)
  options?: ItemOptionsDto;

  @IsOptional()
  @IsArray()
  fieldDefs?: Record<string, any>[];
}
