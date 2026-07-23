import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FilebrowserService } from './filebrowser.service';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';
import { TransactionService } from '../database/transaction.service';

// Workspace._id 형식: MongoDB ObjectId (24자 hex)
const MOCK_WORKSPACE_ID = '507f1f77bcf86cd799439011';
// withTransaction mock이 콜백에 넘길 가짜 세션 (쓰기 호출의 2번째 인자로 검증)
const FAKE_SESSION = {} as any;

describe('FilebrowserService (ObjectId workspace 매핑)', () => {
  let service: FilebrowserService;

  const execMock = jest.fn();
  const leanMock = jest.fn();
  const mockItemModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    bulkWrite: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // getItems의 find().lean().exec() 체이닝 목
    leanMock.mockReturnValue({ exec: execMock });
    mockItemModel.find.mockReturnValue({ lean: leanMock });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilebrowserService,
        {
          provide: getModelToken(FileBrowserItem.name),
          useValue: mockItemModel,
        },
        {
          provide: TransactionService,
          useValue: {
            withTransaction: (work: (session: any) => Promise<unknown>) =>
              work(FAKE_SESSION),
          },
        },
      ],
    }).compile();

    service = module.get<FilebrowserService>(FilebrowserService);
  });

  describe('getItems', () => {
    it('workspaceId 문자열을 ObjectId로 변환하여 workspace 필드를 쿼리한다', async () => {
      execMock.mockResolvedValue([]);

      await service.getItems(MOCK_WORKSPACE_ID);

      expect(mockItemModel.find).toHaveBeenCalledWith({
        workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
      });
    });
  });

  describe('createItem', () => {
    it('아이템 생성 시 workspaceId 문자열을 ObjectId로 변환하여 workspace 필드에 저장한다', async () => {
      mockItemModel.exists.mockResolvedValue(null);
      mockItemModel.create.mockResolvedValue({ name: 'test.json' });

      await service.createItem(MOCK_WORKSPACE_ID, {
        name: 'test.json',
        itemType: 'File',
        parentId: null,
      } as any);

      // 중복 검사 쿼리에도 ObjectId가 사용되어야 한다
      expect(mockItemModel.exists).toHaveBeenCalledWith({
        workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
        name: 'test.json',
        parentId: null,
      });
      expect(mockItemModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
        }),
      );
    });

    it('아이템 생성 시 fieldDefs가 인자에 포함되어 저장된다', async () => {
      mockItemModel.exists.mockResolvedValue(null);
      mockItemModel.create.mockResolvedValue({ name: 'test.json' });

      const fieldDefsMock = [{ id: 'f1', name: 'title', type: 'string' }];
      await service.createItem(MOCK_WORKSPACE_ID, {
        name: 'test.json',
        itemType: 'File',
        parentId: null,
        fieldDefs: fieldDefsMock,
      } as any);

      expect(mockItemModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldDefs: fieldDefsMock,
        }),
      );
    });
  });

  describe('updateItem', () => {
    let mockItemInstance: any;

    beforeEach(() => {
      mockItemInstance = {
        _id: new Types.ObjectId(),
        name: 'old-name.json',
        itemType: 'File',
        path: '/old-name.json',
        parentId: null,
        schema: null,
        json: null,
        options: null,
        fieldDefs: null,
        save: jest.fn().mockResolvedValue(true),
      };
      // updateItem은 이제 findOwnedItem(findOne)으로 workspace 스코프 조회한다
      mockItemModel.findOne.mockResolvedValue(mockItemInstance);
    });

    it('이름이 바뀔 때 중복 검사를 수행하며, 중복이 있을 경우 BadRequestException을 던지고 저장하지 않는다', async () => {
      mockItemModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(
        service.updateItem(
          {
            itemId: mockItemInstance._id.toString(),
            name: 'duplicate-name.json',
          } as any,
          MOCK_WORKSPACE_ID,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockItemModel.exists).toHaveBeenCalled();
      expect(mockItemInstance.save).not.toHaveBeenCalled();
    });

    it('이름이 바뀔 때 중복이 없을 경우 path를 새로 계산하여 업데이트하고 저장한다', async () => {
      mockItemModel.exists.mockResolvedValue(null);

      const result = await service.updateItem(
        {
          itemId: mockItemInstance._id.toString(),
          name: 'new-name.json',
        } as any,
        MOCK_WORKSPACE_ID,
      );

      expect(result.isSuccess).toBe(true);
      expect(mockItemInstance.name).toBe('new-name.json');
      expect(mockItemInstance.path).toBe('/new-name.json');
      expect(mockItemInstance.save).toHaveBeenCalled();
    });

    it('이름이 변경되지 않았을 경우 중복 검사를 수행하지 않고 필드들만 업데이트하여 저장한다', async () => {
      mockItemModel.exists.mockClear();

      const result = await service.updateItem(
        {
          itemId: mockItemInstance._id.toString(),
          name: 'old-name.json', // 변경 없음
          fieldDefs: [{ id: 'f1', name: 'title', type: 'string' }],
          json: { updated: true },
        } as any,
        MOCK_WORKSPACE_ID,
      );

      expect(result.isSuccess).toBe(true);
      expect(mockItemModel.exists).not.toHaveBeenCalled();
      expect(mockItemInstance.fieldDefs).toEqual([
        { id: 'f1', name: 'title', type: 'string' },
      ]);
      expect(mockItemInstance.json).toEqual({ updated: true });
      expect(mockItemInstance.save).toHaveBeenCalled();
    });
  });

  describe('moveItems (동일 이름 폴더 병합)', () => {
    it('같은 이름 폴더로 이동 시 자식을 기존 폴더로 옮기고 원본 폴더를 삭제한다', async () => {
      const srcFolderId = new Types.ObjectId();
      const existingFolderId = new Types.ObjectId();
      const file1 = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/docs/a.json',
        save: jest.fn(),
      };
      const file2 = {
        _id: new Types.ObjectId(),
        name: 'b.json',
        itemType: 'File',
        path: '/docs/b.json',
        save: jest.fn(),
      };
      const srcFolder = {
        _id: srcFolderId,
        name: 'docs',
        itemType: 'Folder',
        path: '/docs',
        save: jest.fn(),
      };
      const existingFolder = {
        _id: existingFolderId,
        name: 'docs',
        itemType: 'Folder',
        path: '/docs',
      };

      // 소스/대상 단일 조회는 이제 findOne({_id, workspace}), 동명 검사도 findOne을 쓴다.
      // name이 있는 쿼리는 동명 검사, _id만 있는 쿼리는 스코프 단일 조회로 구분한다.
      const byId = new Map<string, unknown>([
        [srcFolderId.toString(), srcFolder],
        [existingFolderId.toString(), existingFolder],
        [file1._id.toString(), file1],
        [file2._id.toString(), file2],
      ]);
      mockItemModel.findOne.mockImplementation((q: any) => {
        if (q?.name) {
          // 동명 검사: 폴더 'docs'만 기존 폴더와 충돌, 파일들은 충돌 없음
          return Promise.resolve(q.name === 'docs' ? existingFolder : null);
        }
        if (q?._id) return Promise.resolve(byId.get(String(q._id)) ?? null);
        return Promise.resolve(null);
      });
      // find: 자식 조회/순환검사 모두 [file1, file2] 반환(파일이라 순환검사 통과)
      mockItemModel.find.mockResolvedValue([file1, file2]);

      const result = await service.moveItems({
        workspaceId: MOCK_WORKSPACE_ID,
        dragIds: [srcFolderId.toString()],
        parentId: null,
      });

      // 자식들이 기존 폴더 아래로 이동(save 호출)되고, 원본 폴더는 workspace 스코프로 삭제된다
      expect(file1.save).toHaveBeenCalled();
      expect(file2.save).toHaveBeenCalled();
      expect(mockItemModel.deleteOne).toHaveBeenCalledWith(
        {
          _id: srcFolderId,
          workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
        },
        { session: FAKE_SESSION },
      );
      expect(result).toEqual({ isSuccess: true });
    });
  });

  describe('moveItems (이름 충돌)', () => {
    it('대상 위치에 동일 이름 파일이 있으면 BadRequestException을 던진다(중복 방지)', async () => {
      const src = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
        save: jest.fn(),
      };
      const conflict = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
      };
      mockItemModel.findOne.mockImplementation((q: any) => {
        if (q?.name)
          return Promise.resolve(q.name === 'a.json' ? conflict : null);
        if (q?._id) return Promise.resolve(src);
        return Promise.resolve(null);
      });
      mockItemModel.find.mockResolvedValue([]);

      await expect(
        service.moveItems({
          workspaceId: MOCK_WORKSPACE_ID,
          dragIds: [src._id.toString()],
          parentId: null,
        }),
      ).rejects.toThrow('already exists');
    });

    it('여러 소스 이동 중 이름 충돌이 나면 withTransaction 경계 안에서 실패한다', async () => {
      const src1 = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
        save: jest.fn(),
      };
      const src2 = {
        _id: new Types.ObjectId(),
        name: 'b.json',
        itemType: 'File',
        path: '/b.json',
        save: jest.fn(),
      };
      const conflict = {
        _id: new Types.ObjectId(),
        name: 'b.json',
        itemType: 'File',
        path: '/b.json',
      };
      const byId = new Map<string, unknown>([
        [src1._id.toString(), src1],
        [src2._id.toString(), src2],
      ]);
      mockItemModel.findOne.mockImplementation((q: any) => {
        // 동명 검사: b.json만 충돌
        if (q?.name)
          return Promise.resolve(q.name === 'b.json' ? conflict : null);
        if (q?._id) return Promise.resolve(byId.get(String(q._id)) ?? null);
        return Promise.resolve(null);
      });
      mockItemModel.find.mockResolvedValue([]);

      await expect(
        service.moveItems({
          workspaceId: MOCK_WORKSPACE_ID,
          dragIds: [src1._id.toString(), src2._id.toString()],
          parentId: null,
        }),
      ).rejects.toThrow('already exists');

      // 첫 소소는 세션과 함께 저장 시도됨(실제 DB에서는 롤백됨)
      expect(src1.save).toHaveBeenCalledWith({ session: FAKE_SESSION });
    });
  });

  describe('workspace 스코프(테넌트 격리)', () => {
    it('타 워크스페이스 아이템은 renameItem이 찾지 못하고 NotFound를 던진다', async () => {
      mockItemModel.findOne.mockResolvedValue(null);

      await expect(
        service.renameItem(MOCK_WORKSPACE_ID, {
          workspaceId: MOCK_WORKSPACE_ID,
          itemId: new Types.ObjectId().toString(),
          newName: 'x',
        } as any),
      ).rejects.toThrow('Item not found');
      // _id와 workspace를 함께 조회했는지 확인
      expect(mockItemModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
        }),
      );
    });

    it('deleteItems는 workspace 스코프로 조회하고, 미소유 아이템은 건너뛴다', async () => {
      mockItemModel.findOne.mockResolvedValue(null);

      const res = await service.deleteItems(MOCK_WORKSPACE_ID, [
        new Types.ObjectId().toString(),
      ]);

      expect(res).toEqual({ isSuccess: true });
      expect(mockItemModel.deleteOne).not.toHaveBeenCalled();
      expect(mockItemModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
        }),
      );
    });
  });
});
