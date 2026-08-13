import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RoleService } from './role.service';

const WS_ID = '507f1f77bcf86cd799439011';
const ROLE_ID = '507f1f77bcf86cd799439022';

describe('RoleService', () => {
  let roleModel: { find: jest.Mock; findOneAndUpdate: jest.Mock };
  let service: RoleService;

  beforeEach(() => {
    roleModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: ROLE_ID }) }),
    };
    service = new RoleService(roleModel as never);
  });

  describe('getRoles', () => {
    it('문자열 workspaceId를 ObjectId로 변환해 조회한다', async () => {
      await service.getRoles(WS_ID);

      const [filter] = roleModel.find.mock.calls[0];
      expect(filter.workspace).toBeInstanceOf(Types.ObjectId);
      expect(filter.workspace.toString()).toBe(WS_ID);
    });
  });

  describe('updateRole — 권한 플래그 화이트리스트', () => {
    it('허용된 5개 플래그만 $set에 담는다', async () => {
      await service.updateRole(WS_ID, ROLE_ID, {
        canCreate: true,
        canRename: false,
        canMove: true,
        canDelete: false,
        canUpdate: true,
      });

      const [, update] = roleModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual({
        canCreate: true,
        canRename: false,
        canMove: true,
        canDelete: false,
        canUpdate: true,
      });
    });

    it('role·workspace 같은 화이트리스트 밖 필드는 무시한다', async () => {
      await service.updateRole(WS_ID, ROLE_ID, {
        canCreate: true,
        role: 'owner',
        workspace: 'attacker-workspace',
        owner: 'attacker',
      } as never);

      const [, update] = roleModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual({ canCreate: true });
      expect(update.$set).not.toHaveProperty('role');
      expect(update.$set).not.toHaveProperty('workspace');
      expect(update.$set).not.toHaveProperty('owner');
    });

    it('boolean이 아닌 값은 무시한다 (문자열 "false"로 권한을 켜지 못한다)', async () => {
      await service.updateRole(WS_ID, ROLE_ID, {
        canDelete: 'false',
        canCreate: 1,
        canMove: null,
      } as never);

      const [, update] = roleModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual({});
    });

    it('다른 워크스페이스의 roleId로는 갱신할 수 없도록 workspace 조건을 함께 건다', async () => {
      await service.updateRole(WS_ID, ROLE_ID, { canCreate: true });

      const [filter] = roleModel.findOneAndUpdate.mock.calls[0];
      expect(filter._id.toString()).toBe(ROLE_ID);
      expect(filter.workspace.toString()).toBe(WS_ID);
    });

    it('대상 role이 없으면 NotFoundException을 던진다', async () => {
      roleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateRole(WS_ID, ROLE_ID, { canCreate: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
