// 데코레이터 메타데이터 폴리필 — Nest 부트스트랩 없이 DTO만 단독 검증하므로 직접 로드한다
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RenameItemDto } from './rename-item';
import { MoveItemsDto } from './move-items';
import { CreateItemDto } from './create-item';
import { UpdateItemDto } from './update-item';

const VALID_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';

// 회귀 방지: body의 workspaceId는 두 클라이언트 계약이 다르다.
// - 웹: URL 파라미터로만 전달하고 body에는 넣지 않는다
// - MCP: body에 함께 넣는다 (컨트롤러는 신뢰하지 않고 URL 값을 사용)
// 따라서 DTO에서 workspaceId는 선택 필드여야 두 클라이언트 모두 통과한다.
describe('filebrowser 요청 DTO 검증', () => {
  describe('RenameItemDto', () => {
    it('workspaceId 없이도(웹 클라이언트) 검증을 통과한다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        itemId: VALID_ID,
        newName: 'new-name',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('workspaceId를 포함해도(MCP 클라이언트) 검증을 통과한다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        workspaceId: OTHER_ID,
        itemId: VALID_ID,
        newName: 'new-name',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('newName 형식 규칙(한글·영문·숫자·-·_)은 계속 강제된다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        itemId: VALID_ID,
        newName: '잘못된 이름!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('itemId가 없으면 검증에 실패한다', async () => {
      const dto = plainToInstance(RenameItemDto, { newName: 'new-name' });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('MoveItemsDto', () => {
    it('workspaceId 없이도(웹 클라이언트) 검증을 통과한다', async () => {
      const dto = plainToInstance(MoveItemsDto, {
        dragIds: [VALID_ID],
        parentId: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('dragIds가 없으면 검증에 실패한다', async () => {
      const dto = plainToInstance(MoveItemsDto, { parentId: null });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // 웹 UI가 막더라도 API 직접 호출·MCP 경로가 남아 있으므로 서버에서도 막는다.
  // 판정 규칙은 @workspace/types가 단독 소유한다.
  describe('CreateItemDto fields 중복 필드명', () => {
    const base = {
      name: 'users',
      itemType: 'File' as const,
      parentId: null,
    };

    it('fields가 없으면 검증을 통과한다', async () => {
      const dto = plainToInstance(CreateItemDto, base);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('필드명이 모두 다르면 검증을 통과한다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [{ name: 'email' }, { name: 'title' }],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('같은 스코프에 필드명이 겹치면 검증에 실패한다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [{ name: 'email' }, { name: 'email' }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('fields');
    });

    it('앞뒤 공백만 다른 필드명도 중복으로 본다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [{ name: 'email' }, { name: '  email  ' }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('대소문자가 다르면 중복이 아니다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [{ name: 'email' }, { name: 'Email' }],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('중첩 하위의 중복도 검증에 실패한다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [{ name: 'user', fields: [{ name: 'tag' }, { name: 'tag' }] }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('서로 다른 부모 아래의 동명 필드는 통과한다', async () => {
      const dto = plainToInstance(CreateItemDto, {
        ...base,
        fields: [
          { name: 'user', fields: [{ name: 'name' }] },
          { name: 'company', fields: [{ name: 'name' }] },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('UpdateItemDto도 상속을 통해 같은 규칙을 적용받는다', async () => {
      const dto = plainToInstance(UpdateItemDto, {
        ...base,
        itemId: VALID_ID,
        fields: [{ name: 'email' }, { name: 'email' }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

