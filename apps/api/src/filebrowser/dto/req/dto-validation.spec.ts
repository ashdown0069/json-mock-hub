// 데코레이터 메타데이터 폴리필 — Nest 부트스트랩 없이 DTO만 단독 검증하므로 직접 로드한다
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RenameItemDto } from './rename-item';
import { MoveItemsDto } from './move-items';

// 회귀 방지: body의 workspaceId는 두 클라이언트 계약이 다르다.
// - 웹: URL 파라미터로만 전달하고 body에는 넣지 않는다
// - MCP: body에 함께 넣는다 (컨트롤러는 신뢰하지 않고 URL 값을 사용)
// 따라서 DTO에서 workspaceId는 선택 필드여야 두 클라이언트 모두 통과한다.
describe('filebrowser 요청 DTO 검증', () => {
  describe('RenameItemDto', () => {
    it('workspaceId 없이도(웹 클라이언트) 검증을 통과한다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        itemId: 'item-1',
        newName: 'new-name',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('workspaceId를 포함해도(MCP 클라이언트) 검증을 통과한다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        workspaceId: 'ws-1',
        itemId: 'item-1',
        newName: 'new-name',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('newName 형식 규칙(한글·영문·숫자·-·_)은 계속 강제된다', async () => {
      const dto = plainToInstance(RenameItemDto, {
        itemId: 'item-1',
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
        dragIds: ['item-1'],
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
});
