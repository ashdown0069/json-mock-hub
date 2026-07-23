import { IsBoolean, IsOptional } from 'class-validator';

// permissions: any 자유 객체를 제거하고 boolean 5필드 화이트리스트로 제한
// (role/workspace 등 임의 필드 변조 차단 — 서비스에서도 이 필드들만 $set)
export class UpdateRoleDto {
  @IsBoolean()
  @IsOptional()
  canCreate?: boolean;

  @IsBoolean()
  @IsOptional()
  canRename?: boolean;

  @IsBoolean()
  @IsOptional()
  canMove?: boolean;

  @IsBoolean()
  @IsOptional()
  canDelete?: boolean;

  @IsBoolean()
  @IsOptional()
  canUpdate?: boolean;
}
