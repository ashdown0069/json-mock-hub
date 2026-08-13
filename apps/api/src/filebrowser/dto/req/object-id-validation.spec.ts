import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateItemDto } from './create-item';
import { UpdateItemDto } from './update-item';
import { RenameItemDto } from './rename-item';
import { MoveItemsDto } from './move-items';

const VALID_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';

async function failedProperties<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain));
  return errors.map((error) => error.property).sort();
}

describe('filebrowser DTO의 ObjectId 형식 검증', () => {
  describe('CreateItemDto.parentId', () => {
    it('ObjectId가 아닌 문자열을 거부한다', async () => {
      expect(
        await failedProperties(CreateItemDto, {
          name: 'users',
          itemType: 'File',
          parentId: 'hello',
        }),
      ).toEqual(['parentId']);
    });

    it('null은 루트를 뜻하므로 허용한다', async () => {
      expect(
        await failedProperties(CreateItemDto, {
          name: 'users',
          itemType: 'File',
          parentId: null,
        }),
      ).toEqual([]);
    });

    it('유효한 ObjectId를 허용한다', async () => {
      expect(
        await failedProperties(CreateItemDto, {
          name: 'users',
          itemType: 'File',
          parentId: VALID_ID,
        }),
      ).toEqual([]);
    });
  });

  describe('UpdateItemDto.itemId', () => {
    it('ObjectId가 아닌 문자열을 거부한다', async () => {
      expect(
        await failedProperties(UpdateItemDto, {
          itemId: 'hello',
          name: 'users',
          itemType: 'File',
          parentId: null,
        }),
      ).toEqual(['itemId']);
    });
  });

  describe('RenameItemDto.itemId', () => {
    it('ObjectId가 아닌 문자열을 거부한다', async () => {
      expect(
        await failedProperties(RenameItemDto, {
          itemId: 'hello',
          newName: 'users',
        }),
      ).toEqual(['itemId']);
    });
  });

  describe('MoveItemsDto.dragIds', () => {
    it('요소 중 하나라도 ObjectId가 아니면 거부한다', async () => {
      expect(
        await failedProperties(MoveItemsDto, {
          dragIds: [VALID_ID, 'hello'],
          parentId: null,
        }),
      ).toEqual(['dragIds']);
    });

    it('빈 배열을 거부한다', async () => {
      expect(
        await failedProperties(MoveItemsDto, {
          dragIds: [],
          parentId: null,
        }),
      ).toEqual(['dragIds']);
    });

    it('유효한 ObjectId 배열과 null parentId를 허용한다', async () => {
      expect(
        await failedProperties(MoveItemsDto, {
          dragIds: [VALID_ID, OTHER_ID],
          parentId: null,
        }),
      ).toEqual([]);
    });
  });
});
