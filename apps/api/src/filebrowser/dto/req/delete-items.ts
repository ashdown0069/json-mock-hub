import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

// @Body('itemIds')로 꺼내면 메타타입이 Array라 ValidationPipe가 검증을 건너뛴다.
// 반드시 DTO 클래스로 받아야 검증이 수행된다.
export class DeleteItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  itemIds: string[];
}
