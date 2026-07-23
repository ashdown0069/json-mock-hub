import { IsNotEmpty, IsString } from 'class-validator';
import { CreateItemDto } from './create-item';

export class UpdateItemDto extends CreateItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;
}
