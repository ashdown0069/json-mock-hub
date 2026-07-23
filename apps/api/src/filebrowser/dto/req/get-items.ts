import { IsNotEmpty, IsString } from 'class-validator';

export class GetItemsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
