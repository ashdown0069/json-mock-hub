import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { UpdateWorkspaceDto } from './update-workspace.dto';

async function failedProperties<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain));
  return errors.map((error) => error.property).sort();
}

describe('CreateWorkspaceDto', () => {
  it('password가 없으면 거부한다 (이전에는 bcrypt.hash(undefined)로 500이 났다)', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, { name: 'w' }),
    ).toEqual(['password', 'passwordConfirm']);
  });

  it('password가 4자 미만이면 거부한다', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: 'w',
        password: 'abc',
        passwordConfirm: 'abc',
      }),
    ).toEqual(['password']);
  });

  it('passwordConfirm이 password와 다르면 거부한다', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: 'w',
        password: 'secret1234',
        passwordConfirm: 'secret9999',
      }),
    ).toEqual(['passwordConfirm']);
  });

  it('name이 빈 문자열이면 거부한다', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: '',
        password: 'secret1234',
        passwordConfirm: 'secret1234',
      }),
    ).toEqual(['name']);
  });

  it('올바른 입력을 허용한다', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: 'w',
        description: '설명',
        password: 'secret1234',
        passwordConfirm: 'secret1234',
      }),
    ).toEqual([]);
  });

  it('description이 없거나 빈 문자열이어도 허용한다', async () => {
    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: 'w',
        password: 'secret1234',
        passwordConfirm: 'secret1234',
      }),
    ).toEqual([]);

    expect(
      await failedProperties(CreateWorkspaceDto, {
        name: 'w',
        description: '',
        password: 'secret1234',
        passwordConfirm: 'secret1234',
      }),
    ).toEqual([]);
  });
});

describe('UpdateWorkspaceDto', () => {
  it('PartialType이므로 name만 보내도 허용한다', async () => {
    expect(
      await failedProperties(UpdateWorkspaceDto, { name: '새 이름' }),
    ).toEqual([]);
  });

  it('password를 보내면 passwordConfirm 일치 검사가 유지된다', async () => {
    expect(
      await failedProperties(UpdateWorkspaceDto, {
        password: 'secret1234',
        passwordConfirm: 'secret9999',
      }),
    ).toEqual(['passwordConfirm']);
  });
});
