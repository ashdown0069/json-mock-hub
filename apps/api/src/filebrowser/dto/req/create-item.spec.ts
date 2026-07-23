import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateItemDto } from './create-item';
import { RenameItemDto } from './rename-item';

describe('CreateItemDto name 검증', () => {
  const base = { itemType: 'File', parentId: null };

  it('허용 문자(한글/영문/숫자/-/_)만으로 된 이름은 통과한다', async () => {
    const dto = plainToInstance(CreateItemDto, {
      ...base,
      name: '한글_users-1',
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
  });

  it.each(['a.b', 'a(b)', 'a/b', 'a b', 'a$b'])(
    '금지 문자가 포함된 이름 "%s"은 검증에 실패한다',
    async (name) => {
      const dto = plainToInstance(CreateItemDto, { ...base, name });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    },
  );
});

describe('RenameItemDto newName 검증', () => {
  it('금지 문자가 포함된 newName은 검증에 실패한다', async () => {
    const dto = plainToInstance(RenameItemDto, {
      workspaceId: 'ws1',
      itemId: 'item1',
      newName: 'a.b',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newName')).toBe(true);
  });
});
