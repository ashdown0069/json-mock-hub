import { IsMongoId, IsNotEmpty } from 'class-validator';

// role 필드 제거: body로 'owner'를 주입해 자기승격하는 것을 차단 (항상 member로 추가)
export class AddMemberDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
