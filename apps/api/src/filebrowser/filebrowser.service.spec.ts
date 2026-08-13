import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FilebrowserService } from './filebrowser.service';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';
import { TransactionService } from '../database/transaction.service';
import { MockStateService } from '../mockserver/mock-state.service';

// Workspace._id 형식: MongoDB ObjectId (24자 hex)
const MOCK_WORKSPACE_ID = '507f1f77bcf86cd799439011';
// withTransaction mock이 콜백에 넘길 가짜 세션 (쓰기 호출의 2번째 인자로 검증)
const FAKE_SESSION = {} as any;

describe('FilebrowserService (ObjectId workspace 매핑)', () => {
  let service: FilebrowserService;

  const mockStateService = {
    reset: jest.fn(),
    resetMany: jest.fn(),
    getOverlay: jest.fn(),
    setOverlay: jest.fn(),
    mutate: jest.fn(),
  };

  const execMock = jest.fn();
  const leanMock = jest.fn();
  const mockItemModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
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
        {
          provide: MockStateService,
          useValue: mockStateService,
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
      // 첫 소소는 세션과 함께 저장 시도됨(실제 DB에서는 롤백됨)
      expect(src1.save).toHaveBeenCalledWith({ session: FAKE_SESSION });
    });
  });

  describe('moveItems (트랜잭션 세션 전파)', () => {
    // session 없는 read는 트랜잭션 스냅샷이 아니라 커밋된 데이터를 읽는다.
    // 그래서 직전 반복이 같은 트랜잭션에서 옮긴 결과가 보이지 않고,
    // 동명 충돌 검사가 통과해버려 unique 인덱스 위반(500)으로 새어나간다.
    it('파일 이동 시 모든 읽기 쿼리에 트랜잭션 세션을 전달한다', async () => {
      const targetId = new Types.ObjectId();
      const srcId = new Types.ObjectId();
      const target = {
        _id: targetId,
        name: 'target',
        itemType: 'Folder',
        path: '/target',
        depth: 0,
      };
      const src = {
        _id: srcId,
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
        save: jest.fn().mockResolvedValue(true),
      };

      const byId = new Map<string, unknown>([
        [targetId.toString(), target],
        [srcId.toString(), src],
      ]);
      mockItemModel.findOne.mockImplementation((q: any) => {
        if (q?.name) return Promise.resolve(null); // 동명 충돌 없음
        if (q?._id) return Promise.resolve(byId.get(String(q._id)) ?? null);
        return Promise.resolve(null);
      });
      mockItemModel.find.mockResolvedValue([]); // 순환 이동 검사용 소스 목록

      await service.moveItems({
        workspaceId: MOCK_WORKSPACE_ID,
        dragIds: [srcId.toString()],
        parentId: targetId.toString(),
      });

      expect(mockItemModel.findOne.mock.calls.length).toBeGreaterThan(0);
      for (const call of mockItemModel.findOne.mock.calls) {
        expect(call[2]).toEqual({ session: FAKE_SESSION });
      }
      expect(mockItemModel.find.mock.calls.length).toBeGreaterThan(0);
      for (const call of mockItemModel.find.mock.calls) {
        expect(call[2]).toEqual({ session: FAKE_SESSION });
      }
    });

    it('폴더 병합 재귀에서도 자식·하위 경로 조회에 같은 세션을 쓴다', async () => {
      const srcFolderId = new Types.ObjectId();
      const existingFolderId = new Types.ObjectId();
      const child = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/docs/a.json',
        save: jest.fn().mockResolvedValue(true),
      };
      const srcFolder = {
        _id: srcFolderId,
        name: 'docs',
        itemType: 'Folder',
        path: '/docs',
        save: jest.fn().mockResolvedValue(true),
      };
      const existingFolder = {
        _id: existingFolderId,
        name: 'docs',
        itemType: 'Folder',
        path: '/docs',
      };

      const byId = new Map<string, unknown>([
        [srcFolderId.toString(), srcFolder],
        [existingFolderId.toString(), existingFolder],
        [child._id.toString(), child],
      ]);
      mockItemModel.findOne.mockImplementation((q: any) => {
        if (q?.name) {
          return Promise.resolve(q.name === 'docs' ? existingFolder : null);
        }
        if (q?._id) return Promise.resolve(byId.get(String(q._id)) ?? null);
        return Promise.resolve(null);
      });
      mockItemModel.find.mockResolvedValue([child]);

      await service.moveItems({
        workspaceId: MOCK_WORKSPACE_ID,
        dragIds: [srcFolderId.toString()],
        parentId: null,
      });

      for (const call of mockItemModel.findOne.mock.calls) {
        expect(call[2]).toEqual({ session: FAKE_SESSION });
      }
      for (const call of mockItemModel.find.mock.calls) {
        expect(call[2]).toEqual({ session: FAKE_SESSION });
      }
    });
  });

  describe('renameItem (트랜잭션 경계)', () => {
    it('조회·중복검사·저장·하위경로 갱신을 모두 같은 세션으로 수행한다', async () => {
      // 중복 검사만 트랜잭션 밖에 두면 검사와 저장 사이에 동명이 생겨
      // unique 인덱스 위반(500)으로 새어나간다.
      const item = {
        _id: new Types.ObjectId(),
        name: 'old',
        itemType: 'Folder',
        path: '/old',
        parentId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockItemModel.findOne.mockResolvedValue(item);
      // exists()는 Query를 반환하므로 session() 체이닝이 가능한 목이 필요하다
      const existsSession = jest.fn().mockResolvedValue(null);
      mockItemModel.exists.mockReturnValue({ session: existsSession });
      mockItemModel.find.mockResolvedValue([]);

      await service.renameItem(MOCK_WORKSPACE_ID, {
        workspaceId: MOCK_WORKSPACE_ID,
        itemId: item._id.toString(),
        newName: 'new',
      } as any);

      expect(mockItemModel.findOne.mock.calls[0][2]).toEqual({
        session: FAKE_SESSION,
      });
      expect(existsSession).toHaveBeenCalledWith(FAKE_SESSION);
      expect(item.save).toHaveBeenCalledWith({ session: FAKE_SESSION });
      expect(mockItemModel.find.mock.calls[0][2]).toEqual({
        session: FAKE_SESSION,
      });
      expect(item.name).toBe('new');
      expect(item.path).toBe('/new');
    });
  });

  describe('deleteItems (세션 전파 · 부수효과 순서)', () => {
    it('아이템 조회에 트랜잭션 세션을 전달한다', async () => {
      const item = {
        _id: new Types.ObjectId(),
        itemType: 'File',
        path: '/a.json',
      };
      mockItemModel.findOne.mockResolvedValue(item);
      mockItemModel.deleteOne.mockResolvedValue({});

      await service.deleteItems(MOCK_WORKSPACE_ID, [item._id.toString()]);

      expect(mockItemModel.findOne.mock.calls[0][2]).toEqual({
        session: FAKE_SESSION,
      });
    });

    it('mock 오버레이 초기화를 커밋 이후에 수행한다', async () => {
      // Redis 삭제는 롤백되지 않는다. 트랜잭션 안에서 지우면 DB가 롤백됐을 때
      // 아이템은 그대로인데 사용자의 mock 편집 상태만 사라진다.
      const order: string[] = [];
      const item = {
        _id: new Types.ObjectId(),
        itemType: 'File',
        path: '/a.json',
      };
      const itemModel = {
        findOne: jest.fn().mockResolvedValue(item),
        deleteOne: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      } as any;
      const txService = {
        withTransaction: async (work: (s: any) => Promise<unknown>) => {
          const result = await work(FAKE_SESSION);
          order.push('commit');
          return result;
        },
      } as any;
      const mockState = {
        resetMany: jest.fn(async () => {
          order.push('reset');
        }),
      } as any;

      const svc = new FilebrowserService(itemModel, txService, mockState);
      const res = await svc.deleteItems(MOCK_WORKSPACE_ID, [
        item._id.toString(),
      ]);

      expect(res).toEqual({ isSuccess: true });
      expect(order).toEqual(['commit', 'reset']);
      expect(mockState.resetMany).toHaveBeenCalledWith(MOCK_WORKSPACE_ID, ['/a.json']);
    });

    it('트랜잭션이 롤백되면 mock 오버레이를 건드리지 않는다', async () => {
      const itemModel = {
        findOne: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          itemType: 'File',
          path: '/a.json',
        }),
        deleteOne: jest.fn().mockRejectedValue(new Error('쓰기 실패')),
        deleteMany: jest.fn(),
      } as any;
      const txService = {
        withTransaction: (work: (s: any) => Promise<unknown>) =>
          work(FAKE_SESSION),
      } as any;
      const mockState = { resetMany: jest.fn() } as any;

      const svc = new FilebrowserService(itemModel, txService, mockState);

      await expect(
        svc.deleteItems(MOCK_WORKSPACE_ID, [new Types.ObjectId().toString()]),
      ).rejects.toThrow('쓰기 실패');
      expect(mockState.resetMany).not.toHaveBeenCalled();
    });
  });

  describe('updateItem (부수효과 순서)', () => {
    it('저장이 끝난 뒤에 mock 오버레이를 초기화한다', async () => {
      const order: string[] = [];
      const item = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
        parentId: null,
        save: jest.fn(async () => {
          order.push('save');
          return true;
        }),
      };
      const itemModel = { findOne: jest.fn().mockResolvedValue(item) } as any;
      const mockState = {
        resetMany: jest.fn(async () => {
          order.push('reset');
        }),
      } as any;

      const svc = new FilebrowserService(itemModel, {} as any, mockState);
      await svc.updateItem(
        { itemId: item._id.toString(), json: { a: 1 } } as any,
        MOCK_WORKSPACE_ID,
      );

      expect(order).toEqual(['save', 'reset']);
    });

    it('저장이 실패하면 mock 오버레이를 건드리지 않는다', async () => {
      const item = {
        _id: new Types.ObjectId(),
        name: 'a.json',
        itemType: 'File',
        path: '/a.json',
        parentId: null,
        save: jest.fn(async () => {
          throw new Error('저장 실패');
        }),
      };
      const itemModel = { findOne: jest.fn().mockResolvedValue(item) } as any;
      const mockState = { resetMany: jest.fn() } as any;

      const svc = new FilebrowserService(itemModel, {} as any, mockState);

      await expect(
        svc.updateItem(
          { itemId: item._id.toString(), json: { a: 1 } } as any,
          MOCK_WORKSPACE_ID,
        ),
      ).rejects.toThrow('저장 실패');
      expect(mockState.resetMany).not.toHaveBeenCalled();
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
      // _id와 workspace를 함께 조회했는지 확인 — 세션 인자가 뒤에 붙으므로 필터만 본다
      expect(mockItemModel.findOne.mock.calls[0][0]).toMatchObject({
        workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
      });
    });

    it('deleteItems는 workspace 스코프로 조회하고, 미소유 아이템은 건너뛴다', async () => {
      mockItemModel.findOne.mockResolvedValue(null);

      const res = await service.deleteItems(MOCK_WORKSPACE_ID, [
        new Types.ObjectId().toString(),
      ]);

      expect(res).toEqual({ isSuccess: true });
      expect(mockItemModel.deleteOne).not.toHaveBeenCalled();
      expect(mockItemModel.findOne.mock.calls[0][0]).toMatchObject({
        workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
      });
    });
  });

  describe('resetMockState', () => {
    it('아이템을 찾을 수 없으면 NotFoundException을 던진다', async () => {
      mockItemModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetMockState(MOCK_WORKSPACE_ID, new Types.ObjectId().toString()),
      ).rejects.toThrow('Item not found');
    });

    it('아이템이 존재하면 resetMockState가 success를 반환한다', async () => {
      mockItemModel.findOne.mockResolvedValue({ path: '/users' });

      const result = await service.resetMockState(
        MOCK_WORKSPACE_ID,
        new Types.ObjectId().toString(),
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('FilebrowserService.getItems — 뷰별 투영', () => {
    const WS_ID = '507f1f77bcf86cd799439011';
    const ITEM_ID = '507f1f77bcf86cd799439012';

    const createService = (resolved: unknown = []) => {
      const exec = jest.fn().mockResolvedValue(resolved);
      const lean = jest.fn().mockReturnValue({ exec });
      const select = jest.fn().mockReturnThis();
      const query: Record<string, unknown> = { select, lean };
      // select는 체이닝을 위해 query 자신을 돌려줘야 한다
      (query.select as jest.Mock).mockReturnValue(query);

      const find = jest.fn().mockReturnValue(query);
      const findOne = jest.fn().mockReturnValue({ lean });
      const itemModel = { find, findOne } as any;
      const mockStateService = { resetMany: jest.fn() } as any;
      const service = new FilebrowserService(itemModel, {} as any, mockStateService);
      return { service, find, findOne, select };
    };

    it('기본 호출은 select 없이 전체 문서를 조회한다 (기존 동작 유지)', async () => {
      const { service, select } = createService();

      await service.getItems(WS_ID);

      expect(select).not.toHaveBeenCalled();
    });

    it("view가 'tree'면 json/schema/fieldDefs를 제외한 투영을 적용한다", async () => {
      const { service, select } = createService();

      await service.getItems(WS_ID, 'tree');

      const projection = select.mock.calls[0][0];
      expect(projection).toMatchObject({
        name: 1,
        itemType: 1,
        parentId: 1,
        path: 1,
      });
      expect(projection).not.toHaveProperty('json');
      expect(projection).not.toHaveProperty('schema');
      expect(projection).not.toHaveProperty('fieldDefs');
    });

    it('getItem은 workspace 스코프로 단건을 조회한다', async () => {
      const { service, findOne } = createService({ _id: ITEM_ID });

      await service.getItem(WS_ID, ITEM_ID);

      expect(findOne.mock.calls[0][0]).toMatchObject({ _id: ITEM_ID });
      expect(findOne.mock.calls[0][0]).toHaveProperty('workspace');
    });

    it('getItem은 없는 아이템에 NotFoundException을 던진다', async () => {
      const { service } = createService(null);

      await expect(service.getItem(WS_ID, ITEM_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deleteItems — 오버레이 폐기', () => {
    const folder = {
      _id: new Types.ObjectId(),
      path: '/a',
      itemType: 'Folder',
      workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
    };

    it('폴더 삭제 시 하위 항목 경로까지 함께 폐기한다', async () => {
      // findOwnedItem이 폴더를 반환하도록
      mockItemModel.findOne.mockResolvedValueOnce(folder);
      // 하위 경로 수집용 find
      mockItemModel.find.mockResolvedValueOnce([
        { path: '/a/users' },
        { path: '/a/posts' },
      ]);
      mockItemModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockItemModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

      await service.deleteItems(MOCK_WORKSPACE_ID, [folder._id.toString()]);

      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/a', '/a/users', '/a/posts'],
      );
    });

    it('하위 경로 수집은 삭제 전에 같은 세션으로 수행한다', async () => {
      mockItemModel.findOne.mockResolvedValueOnce(folder);
      mockItemModel.find.mockResolvedValueOnce([{ path: '/a/users' }]);
      mockItemModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockItemModel.deleteMany.mockResolvedValue({ deletedCount: 1 });

      await service.deleteItems(MOCK_WORKSPACE_ID, [folder._id.toString()]);

      // session 없는 read는 트랜잭션 스냅샷을 벗어나 방금 지운 형제가 보인다
      expect(mockItemModel.find).toHaveBeenCalledWith(
        {
          workspace: new Types.ObjectId(MOCK_WORKSPACE_ID),
          path: { $regex: '^/a/' },
        },
        'path',
        { session: FAKE_SESSION },
      );
    });
  });

  describe('renameItem — 오버레이 폐기', () => {
    const makeItem = (over: Record<string, unknown> = {}) => ({
      _id: new Types.ObjectId(),
      name: 'users',
      path: '/users',
      itemType: 'File',
      parentId: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...over,
    });

    it('파일 이름 변경 시 옛 경로와 새 경로를 함께 폐기한다', async () => {
      const item = makeItem();
      mockItemModel.findOne.mockResolvedValueOnce(item);
      // renameItem은 assertNameAvailable에 session을 넘긴다. 그 경로는
      // exists(...).session(session)으로 체이닝하므로 Query 형태의 목이 필요하다
      // (기존 spec:455-457과 같은 패턴). mockResolvedValue(null)로 두면
      // .session is not a function으로 죽는다.
      mockItemModel.exists.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await service.renameItem(MOCK_WORKSPACE_ID, {
        itemId: item._id.toString(),
        newName: 'people',
      } as never);

      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/users', '/people'],
      );
    });

    it('폴더 이름 변경 시 하위 항목의 옛/새 경로까지 폐기한다', async () => {
      const folder = makeItem({ name: 'a', path: '/a', itemType: 'Folder' });
      mockItemModel.findOne.mockResolvedValueOnce(folder);
      mockItemModel.exists.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });
      mockItemModel.find.mockResolvedValueOnce([
        { _id: new Types.ObjectId(), path: '/a/users' },
      ]);
      mockItemModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

      await service.renameItem(MOCK_WORKSPACE_ID, {
        itemId: folder._id.toString(),
        newName: 'b',
      } as never);

      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/a', '/b', '/a/users', '/b/users'],
      );
    });
  });

  describe('moveItems — 오버레이 폐기', () => {
    it('파일을 루트에서 폴더로 옮기면 옛/새 경로를 폐기한다', async () => {
      const target = {
        _id: new Types.ObjectId(),
        path: '/box',
        depth: 0,
        itemType: 'Folder',
      };
      const source = {
        _id: new Types.ObjectId(),
        name: 'users',
        path: '/users',
        itemType: 'File',
        parentId: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      // 1) 대상 폴더 조회  2) 순환 이동 검사용 find  3) source 조회  4) 동명 충돌 검사
      mockItemModel.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(null);
      mockItemModel.find.mockResolvedValueOnce([source]);

      await service.moveItems({
        workspaceId: MOCK_WORKSPACE_ID,
        dragIds: [source._id.toString()],
        parentId: target._id.toString(),
      } as never);

      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/users', '/box/users'],
      );
    });

    it('폴더를 옮기면 하위 항목의 옛/새 경로까지 폐기한다', async () => {
      const source = {
        _id: new Types.ObjectId(),
        name: 'a',
        path: '/a',
        itemType: 'Folder',
        parentId: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      // parentId: null → 대상 폴더 조회·순환 검사 없이 바로 source 조회
      mockItemModel.findOne
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(null);
      // 하위 항목 조회
      mockItemModel.find.mockResolvedValueOnce([
        { _id: new Types.ObjectId(), path: '/a/users' },
      ]);
      mockItemModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

      await service.moveItems({
        workspaceId: MOCK_WORKSPACE_ID,
        dragIds: [source._id.toString()],
        parentId: null,
      } as never);

      // 루트로 옮기므로 경로는 그대로지만, 계약상 옛/새 경로를 모두 올려야 한다
      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/a', '/a', '/a/users', '/a/users'],
      );
    });
  });

  describe('updateItem — 오버레이 폐기', () => {
    it('이름이 바뀌면 옛 경로와 새 경로를 함께 폐기한다', async () => {
      const item = {
        _id: new Types.ObjectId(),
        name: 'users',
        path: '/users',
        itemType: 'File',
        parentId: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockItemModel.findOne.mockResolvedValueOnce(item);
      mockItemModel.exists.mockResolvedValue(null);

      await service.updateItem(
        { itemId: item._id.toString(), name: 'people' } as never,
        MOCK_WORKSPACE_ID,
      );

      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/users', '/people'],
      );
    });

    it('이름이 그대로면 현재 경로만 폐기한다', async () => {
      const item = {
        _id: new Types.ObjectId(),
        name: 'users',
        path: '/users',
        itemType: 'File',
        parentId: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockItemModel.findOne.mockResolvedValueOnce(item);

      await service.updateItem(
        { itemId: item._id.toString(), json: [{ id: 1 }] } as never,
        MOCK_WORKSPACE_ID,
      );

      // 스키마·데이터가 바뀌었으므로 편집 상태는 무효다. 중복은 resetMany가 걸러낸다.
      expect(mockStateService.resetMany).toHaveBeenCalledWith(
        MOCK_WORKSPACE_ID,
        ['/users', '/users'],
      );
    });
  });
});
