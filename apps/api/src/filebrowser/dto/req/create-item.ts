import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsUniqueFieldNames } from '../../validators/unique-field-names.validator';

import { MockResourceType } from '@workspace/types';

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

export class SortParamsDto {
  @IsString()
  @IsOptional()
  sortParam?: string;

  @IsString()
  @IsOptional()
  orderParam?: string;
}

export class SearchParamsDto {
  @IsString()
  @IsOptional()
  searchParam?: string;
}

export class ItemOptionsDto {
  @IsIn(['collection', 'object'], {
    message: 'resourceType은 collection 또는 object여야 합니다.',
  })
  @IsOptional()
  resourceType?: MockResourceType;

  @IsBoolean()
  @IsOptional()
  pagination?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationParamsDto)
  paginationParams?: PaginationParamsDto;

  @IsBoolean()
  @IsOptional()
  sort?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SortParamsDto)
  sortParams?: SortParamsDto;

  @IsBoolean()
  @IsOptional()
  search?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchParamsDto)
  searchParams?: SearchParamsDto;
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

  @ValidateIf((o) => o.parentId !== null) // null은 루트를 뜻하므로 형식 검사를 건너뛴다
  @IsMongoId()
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
  @IsUniqueFieldNames()
  fieldDefs?: Record<string, any>[];
}
