import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeleteItemsDto } from './delete-items';

const VALID_ID = '507f1f77bcf86cd799439011';

async function failedProperties(
  plain: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(DeleteItemsDto, plain));
  return errors.map((error) => error.property);
}

describe('DeleteItemsDto', () => {
  it('itemIds가 없으면 거부한다', async () => {
    expect(await failedProperties({})).toEqual(['itemIds']);
  });

  it('itemIds가 문자열이면 거부한다 (문자열은 iterable이라 글자 단위로 순회됐었다)', async () => {
    expect(await failedProperties({ itemIds: 'abc' })).toEqual(['itemIds']);
  });

  it('빈 배열이면 거부한다', async () => {
    expect(await failedProperties({ itemIds: [] })).toEqual(['itemIds']);
  });

  it('ObjectId가 아닌 요소를 거부한다', async () => {
    expect(await failedProperties({ itemIds: [VALID_ID, 'hello'] })).toEqual([
      'itemIds',
    ]);
  });

  it('유효한 ObjectId 배열을 허용한다', async () => {
    expect(await failedProperties({ itemIds: [VALID_ID] })).toEqual([]);
  });
});
