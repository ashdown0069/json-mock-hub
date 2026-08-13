import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  FileBrowserItem,
  FileBrowserItemDocument,
} from '../database/schema/file-browser-item.schema';
import { TransactionService } from '../database/transaction.service';
import { CreateItemDto } from './dto/req/create-item';
import { MoveItemsDto } from './dto/req/move-items';
import { RenameItemDto } from './dto/req/rename-item';
import { UpdateItemDto } from './dto/req/update-item';

import { MockStateService } from '../mockserver/mock-state.service';

@Injectable()
export class FilebrowserService {
  constructor(
    @InjectModel(FileBrowserItem.name)
    private readonly itemModel: Model<FileBrowserItemDocument>,
    private readonly txService: TransactionService,
    private readonly mockStateService: MockStateService,
  ) {}

  /**
   * 트리 렌더링·경로 해석에 필요한 최소 필드.
   * mock json/schema/fieldDefs 원본을 제외해 목록 응답 크기를 줄인다
   * (파일당 최대 100KB × 아이템 수만큼 매번 전송되던 문제).
   */
  private static readonly TREE_PROJECTION = {
    name: 1,
    itemType: 1,
    parentId: 1,
    path: 1,
    depth: 1,
    workspace: 1,
    options: 1,
  } as const;

  async getItems(
    workspaceId: string,
    view: 'full' | 'tree' = 'full',
  ): Promise<FileBrowserItem[]> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const query = this.itemModel.find({ workspace: wsObjectId });

    if (view === 'tree') {
      query.select(FilebrowserService.TREE_PROJECTION);
    }

    return query.lean().exec();
  }

  /** 상세 패널·코드 생성용 단건 조회. 목록에서 제외한 json/schema/fieldDefs를 여기서 가져온다. */
  async getItem(workspaceId: string, itemId: string): Promise<FileBrowserItem> {
    const item = await this.itemModel
      .findOne({ _id: itemId, workspace: new Types.ObjectId(workspaceId) })
      .lean()
      .exec();

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  private async assertNameAvailable(
    workspaceId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    name: string,
    itemType: 'File' | 'Folder',
    excludeId?: Types.ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    // Model.exists()는 mongoose 8 타입에 옵션 인자가 없어 세션을 넘길 방법이
    // 쿼리 체이닝뿐이다. 세션이 없을 때 .session(null)을 굳이 부르지 않는 것은
    // 트랜잭션 밖 호출부(createItem/updateItem)의 반환 형태를 그대로 두기 위해서다.
    const query = this.itemModel.exists({
      workspace: workspaceId,
      parentId,
      name,
      ...(excludeId && { _id: { $ne: excludeId } }),
    });
    const hasDuplicate = await (session ? query.session(session) : query);

    if (hasDuplicate) {
      throw new BadRequestException({
        message:
          itemType === 'Folder'
            ? 'Folder name already exists'
            : 'File name already exists',
        key: 'duplicate',
      });
    }
  }

  /**
   * 아이템을 workspace 스코프로 조회한다(타 워크스페이스 접근 차단).
   *
   * session은 트랜잭션 안에서 호출될 때 반드시 넘겨야 한다. 넘기지 않으면 같은
   * 트랜잭션의 미커밋 변경이 보이지 않아, 직전에 옮긴 문서를 옛 위치에서 읽는다.
   */
  private async findOwnedItem(
    itemId: string | Types.ObjectId,
    wsObjectId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const item = await this.itemModel.findOne(
      { _id: itemId, workspace: wsObjectId },
      null,
      {
        session,
      },
    );

    return item;
  }

  async createItem(
    workspaceId: string,
    body: CreateItemDto,
  ): Promise<FileBrowserItem> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const parentIdObj = body.parentId
      ? new Types.ObjectId(body.parentId)
      : null;

    await this.assertNameAvailable(
      wsObjectId,
      parentIdObj,
      body.name,
      body.itemType,
    );

    let parentPath = '/';
    let parentDepth = 0;

    if (parentIdObj) {
      const parentItem = await this.findOwnedItem(parentIdObj, wsObjectId);
      if (!parentItem || parentItem.itemType !== 'Folder') {
        throw new BadRequestException({
          message: 'Invalid parent folder',
          key: 'invalidParent',
        });
      }
      parentPath = parentItem.path;
      parentDepth = parentItem.depth;
    }

    const newPath =
      parentPath === '/' ? `/${body.name}` : `${parentPath}/${body.name}`;

    const newItem = await this.itemModel.create({
      workspace: wsObjectId,
      name: body.name,
      itemType: body.itemType,
      path: newPath,
      depth: parentDepth + 1,
      parentId: parentIdObj,
      ...(body.schema != null && { schema: body.schema }),
      ...(body.json != null && { json: body.json }),
      ...(body.options != null && { options: body.options }),
      ...(body.fieldDefs != null && { fieldDefs: body.fieldDefs }),
    });

    return newItem;
  }

  async moveItems(body: MoveItemsDto): Promise<{ isSuccess: boolean }> {
    // 컨트롤러가 URL 파라미터 값으로 덮어쓰지만 DTO 상으로는 선택 필드다.
    // 오버레이 폐기에 반드시 필요한 값이므로 서비스에서 한 번 더 막는다.
    const { workspaceId } = body;
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    // 다중 문서 이동(save/deleteOne/bulkWrite)을 단일 트랜잭션으로 묶어
    // 중간 실패 시 부분 이동 상태가 남지 않도록 전체 롤백한다.
    const { changedPaths } = await this.txService.withTransaction((session) =>
      this.applyMove(body, session),
    );

    // Redis는 롤백되지 않으므로 커밋이 확정된 뒤에만 폐기한다.
    await this.mockStateService.resetMany(workspaceId, changedPaths);

    return { isSuccess: true };
  }

  private async applyMove(
    body: MoveItemsDto,
    session: ClientSession,
  ): Promise<{ isSuccess: boolean; changedPaths: string[] }> {
    const wsObjectId = new Types.ObjectId(body.workspaceId);
    const { dragIds: sourceIds, parentId: targetId } = body;
    const targetIdObj = targetId ? new Types.ObjectId(targetId) : null;

    // 경로가 바뀐(또는 사라진) 모든 항목의 옛/새 경로. 커밋 후 오버레이 폐기에 쓴다.
    const changedPaths: string[] = [];

    let targetPath = '/';
    let targetDepth = 0;

    // targetIdObj가 아니라 targetId로 가드해야 targetId의 null이 내로잉된다.
    // 192행에서 targetIdObj는 targetId의 truthiness로 만들어지므로 조건은 동일하다.
    if (targetId) {
      if (sourceIds.includes(targetId)) {
        throw new BadRequestException('Cannot move item into itself');
      }
      const targetItem = await this.findOwnedItem(
        new Types.ObjectId(targetId),
        wsObjectId,
        session,
      );
      if (!targetItem || targetItem.itemType !== 'Folder') {
        throw new BadRequestException('Invalid target folder');
      }
      targetPath = targetItem.path;
      targetDepth = targetItem.depth;

      // 순환 이동 방지 로직 (부모 폴더를 자식 폴더 안으로 이동 불가)
      const sourceItems = await this.itemModel.find(
        { _id: { $in: sourceIds }, workspace: wsObjectId },
        null,
        { session },
      );
      const isInvalidMove = sourceItems.some(
        (src) =>
          src.itemType === 'Folder' && targetPath.startsWith(`${src.path}/`),
      );
      if (isInvalidMove) {
        throw new BadRequestException('Cannot move item into its descendant');
      }
    }

    for (const sourceId of sourceIds) {
      const sourceItem = await this.findOwnedItem(
        sourceId,
        wsObjectId,
        session,
      );
      if (!sourceItem) continue;

      // 세션을 빼면 직전 반복이 옮겨 놓은 동명 아이템이 보이지 않아 충돌을 놓치고,
      // unique 인덱스에서 E11000으로 터져 400이어야 할 응답이 500이 된다.
      const existingItem = await this.itemModel.findOne(
        {
          workspace: wsObjectId,
          parentId: targetIdObj,
          name: sourceItem.name,
          _id: { $ne: sourceItem._id },
        },
        null,
        { session },
      );

      // 대상 위치에 같은 이름의 폴더가 이미 있으면 충돌로 막지 않고 병합한다.
      // (폴더가 아닌 쪽이 하나라도 섞이면 병합할 수 없으므로 아래 nameConflict로 떨어진다)
      if (
        existingItem &&
        existingItem.itemType === 'Folder' &&
        sourceItem.itemType === 'Folder'
      ) {
        // 1. 원본 폴더의 자식을 먼저 모은다. 아래에서 원본을 지우므로
        //    삭제 후에는 parentId로 자식을 다시 찾을 수 없다.
        const children = await this.itemModel.find(
          { parentId: sourceItem._id, workspace: wsObjectId },
          null,
          { session },
        );

        // 2. 자식을 대상 폴더로 재귀 이동한다. 같은 session을 넘겨
        //    바깥 트랜잭션에 묶어야 중간 실패 시 전체가 함께 롤백된다.
        if (children.length > 0) {
          const nested = await this.applyMove(
            {
              workspaceId: wsObjectId.toString(),
              dragIds: children.map((child) => child._id.toString()),
              parentId: existingItem._id.toString(),
            },
            session,
          );
          // 재귀가 모은 경로를 잃지 않도록 합친다
          changedPaths.push(...nested.changedPaths);
        }

        // 3. 자식이 모두 빠져나간 뒤에야 빈 껍데기가 된 원본 폴더를 지운다.
        await this.itemModel.deleteOne(
          { _id: sourceItem._id, workspace: wsObjectId },
          { session },
        );
        // 사라진 폴더의 오버레이도 폐기 대상이다
        changedPaths.push(sourceItem.path);
        continue;
      }

      // 병합 대상이 아닌데 동일 이름이 이미 있으면 중복 path가 되므로 차단
      if (existingItem) {
        throw new BadRequestException({
          message:
            'An item with the same name already exists in the target location',
          key: 'nameConflict',
        });
      }

      // 겹치지 않으면 아이템 이동
      const oldPath = sourceItem.path;
      const newPath =
        targetPath === '/'
          ? `/${sourceItem.name}`
          : `${targetPath}/${sourceItem.name}`;
      changedPaths.push(oldPath, newPath);

      sourceItem.parentId = targetIdObj;
      sourceItem.path = newPath;
      sourceItem.depth = targetDepth + 1;
      await sourceItem.save({ session });

      // 대상이 폴더면 하위 항목들도 일괄 업데이트 (정규식을 활용해 경로를 전부 바꿈)
      if (sourceItem.itemType === 'Folder') {
        const descendants = await this.itemModel.find(
          { workspace: wsObjectId, path: { $regex: `^${oldPath}/` } },
          null,
          { session },
        );

        const bulkOps = [];
        for (const desc of descendants) {
          const replacedPath = desc.path.replace(
            new RegExp(`^${oldPath}`),
            newPath,
          );
          // depth 갱신을 위해 '/' 갯수를 카운트 (간단한 산술계산)
          const newDescDepth = replacedPath.split('/').length - 1;
          changedPaths.push(desc.path, replacedPath);

          bulkOps.push({
            updateOne: {
              filter: { _id: desc._id },
              update: { $set: { path: replacedPath, depth: newDescDepth } },
            },
          });
        }

        if (bulkOps.length > 0) {
          await this.itemModel.bulkWrite(bulkOps, { session });
        }
      }
    }
    return { isSuccess: true, changedPaths };
  }

  async renameItem(
    workspaceId: string,
    body: RenameItemDto,
  ): Promise<{ isSuccess: boolean }> {
    const { itemId, newName } = body;
    const wsObjectId = new Types.ObjectId(workspaceId);

    // 조회·중복검사·쓰기를 한 트랜잭션 안에서 처리한다. 검사만 밖에 두면
    // 검사와 저장 사이에 같은 이름이 생겼을 때 unique 인덱스에서 E11000이 터져
    // 400 duplicate이어야 할 응답이 500으로 나간다.
    // Redis 오버레이 폐기는 롤백되지 않으므로 트랜잭션 안에서 하지 않는다.
    // 바뀐 경로만 모아 올려 커밋이 확정된 뒤 한 번에 정리한다.
    const changedPaths = await this.txService.withTransaction(
      async (session) => {
        const item = await this.findOwnedItem(itemId, wsObjectId, session);
        if (!item) throw new NotFoundException('Item not found');

        await this.assertNameAvailable(
          wsObjectId,
          item.parentId,
          newName,
          item.itemType,
          item._id as Types.ObjectId,
          session,
        );

        const oldPath = item.path;
        const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
        const newPath =
          parentPath === '' ? `/${newName}` : `${parentPath}/${newName}`;

        item.name = newName;
        item.path = newPath;
        await item.save({ session });

        // 옛 경로 키가 남으면 TTL(1시간) 안에 같은 이름을 다시 만든 항목이
        // 무관한 이전 편집 상태를 물려받는다. 양쪽을 함께 폐기한다.
        const paths: string[] = [oldPath, newPath];

        if (item.itemType === 'Folder') {
          const descendants = await this.itemModel.find(
            { workspace: wsObjectId, path: { $regex: `^${oldPath}/` } },
            null,
            { session },
          );

          const bulkOps = [];
          for (const desc of descendants) {
            const replacedPath = desc.path.replace(
              new RegExp(`^${oldPath}`),
              newPath,
            );
            paths.push(desc.path, replacedPath);
            bulkOps.push({
              updateOne: {
                filter: { _id: desc._id },
                update: { $set: { path: replacedPath } },
              },
            });
          }

          if (bulkOps.length > 0) {
            await this.itemModel.bulkWrite(bulkOps, { session });
          }
        }

        return paths;
      },
    );

    await this.mockStateService.resetMany(workspaceId, changedPaths);

    return { isSuccess: true };
  }

  async updateItem(
    body: UpdateItemDto,
    workspaceId: string,
  ): Promise<{ isSuccess: boolean; item: FileBrowserItem | undefined }> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const item = await this.findOwnedItem(body.itemId, wsObjectId);
    if (!item) throw new NotFoundException('Item not found');

    // 이름이 바뀌면 아래에서 item.path를 덮어쓰므로 지금 값을 붙잡아 둔다
    const oldPath = item.path;

    if (body.schema !== undefined) item.schema = body.schema as any;
    if (body.json !== undefined) item.json = body.json;
    if (body.options !== undefined) item.options = body.options as any;
    if (body.fieldDefs !== undefined) item.fieldDefs = body.fieldDefs;

    if (body.name && body.name !== item.name) {
      await this.assertNameAvailable(
        wsObjectId,
        item.parentId,
        body.name,
        item.itemType,
        item._id as Types.ObjectId,
      );

      const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
      item.name = body.name;
      item.path =
        parentPath === '' ? `/${body.name}` : `${parentPath}/${body.name}`;
    }

    await item.save();

    // 저장이 확정된 뒤에 오버레이를 버린다. 순서를 뒤집으면 save가 실패했을 때
    // 문서는 그대로인데 사용자의 mock 편집 상태만 사라진다.
    //
    // 옛 경로도 함께 버린다. 남겨 두면 TTL(1시간) 안에 같은 이름을 다시 만든
    // 항목이 무관한 이전 편집 상태를 물려받는다.
    //
    // NOTE: 이 메서드는 폴더 이름이 바뀌어도 하위 항목의 path를 갱신하지 않는다
    // (renameItem은 bulkWrite로 갱신한다). 그 비대칭은 별개 과제로 남아 있으므로,
    // 여기서는 이 항목 자신의 경로만 폐기한다.
    await this.mockStateService.resetMany(workspaceId, [oldPath, item.path]);

    return { isSuccess: true, item };
  }

  async resetMockState(
    workspaceId: string,
    itemId: string,
  ): Promise<{ success: true }> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const item = await this.findOwnedItem(itemId, wsObjectId);
    if (!item) throw new NotFoundException('Item not found');
    await this.mockStateService.reset(workspaceId, item.path);
    return { success: true };
  }

  async deleteItems(
    workspaceId: string,
    itemIds: string[],
  ): Promise<{ isSuccess: boolean }> {
    const wsObjectId = new Types.ObjectId(workspaceId);

    // Redis 오버레이 삭제는 롤백되지 않는다. 트랜잭션 안에서 지우면 뒤이어 DB가
    // 롤백됐을 때 "아이템은 살아 있는데 mock 편집 상태만 초기화된" 상태가 남는다.
    // 삭제한 경로를 모아 두었다가 커밋이 확정된 뒤 한 번에 정리한다.
    const deletedPaths = await this.txService.withTransaction(
      async (session) => {
        const paths: string[] = [];

        for (const targetId of itemIds) {
          const item = await this.findOwnedItem(targetId, wsObjectId, session);
          if (!item) continue;

          paths.push(item.path);

          await this.itemModel.deleteOne(
            { _id: item._id, workspace: wsObjectId },
            { session },
          );

          if (item.itemType === 'Folder') {
            // deleteMany는 지운 문서를 돌려주지 않는다. 하위 경로를 먼저 모아 두지 않으면
            // 같은 이름으로 다시 만든 파일이 이전 세션의 오버레이(TTL 1시간)를 물려받는다.
            const descendants = await this.itemModel.find(
              {
                workspace: wsObjectId,
                path: { $regex: `^${item.path}/` },
              },
              'path',
              { session },
            );
            for (const descendant of descendants) {
              paths.push(descendant.path);
            }

            await this.itemModel.deleteMany(
              {
                workspace: wsObjectId,
                path: { $regex: `^${item.path}/` },
              },
              { session },
            );
          }
        }

        return paths;
      },
    );

    await this.mockStateService.resetMany(workspaceId, deletedPaths);

    return { isSuccess: true };
  }
}
