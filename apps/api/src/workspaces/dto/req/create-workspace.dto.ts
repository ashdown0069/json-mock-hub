import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MatchesProperty } from '../../../common/validators/matches-property.validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // joinWorkspace가 비밀번호 대조로만 동작하므로 필수다.
  // 이전에는 @IsOptional()이라 미지정 시 bcrypt.hash(undefined)가 reject되어 500이 났다.
  @IsString()
  @MinLength(4, { message: '비밀번호는 4자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @MatchesProperty('password', { message: '비밀번호가 일치하지 않습니다.' })
  passwordConfirm: string;
}
