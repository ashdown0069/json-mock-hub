import { IsMongoId } from 'class-validator';
import { CreateItemDto } from './create-item';

export class UpdateItemDto extends CreateItemDto {
  @IsMongoId()
  itemId: string;
}
