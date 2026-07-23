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

@Injectable()
export class FilebrowserService {
  constructor(
    @InjectModel(FileBrowserItem.name)
    private readonly itemModel: Model<FileBrowserItemDocument>,
    private readonly txService: TransactionService,
  ) {}

  async getItems(workspaceId: string): Promise<FileBrowserItem[]> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    return this.itemModel.find({ workspace: wsObjectId }).lean().exec();
  }

  private async assertNameAvailable(
    workspaceId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    name: string,
    itemType: 'File' | 'Folder',
    excludeId?: Types.ObjectId,
  ): Promise<void> {
    const hasDuplicate = await this.itemModel.exists({
      workspace: workspaceId,
      parentId,
      name,
      ...(excludeId && { _id: { $ne: excludeId } }),
    });

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

  /** 아이템을 workspace 스코프로 조회한다(타 워크스페이스 접근 차단). */
  private findOwnedItem(
    itemId: string | Types.ObjectId,
    wsObjectId: Types.ObjectId,
  ) {
    return this.itemModel.findOne({ _id: itemId, workspace: wsObjectId });
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
    // 다중 문서 이동(save/deleteOne/bulkWrite)을 단일 트랜잭션으로 묶어
    // 중간 실패 시 부분 이동 상태가 남지 않도록 전체 롤백한다.
    return this.txService.withTransaction((session) =>
      this.applyMove(body, session),
    );
  }

  private async applyMove(
    body: MoveItemsDto,
    session: ClientSession,
  ): Promise<{ isSuccess: boolean }> {
    const wsObjectId = new Types.ObjectId(body.workspaceId);
    const { dragIds: sourceIds, parentId: targetId } = body;
    const targetIdObj = targetId ? new Types.ObjectId(targetId) : null;

    let targetPath = '/';
    let targetDepth = 0;

    if (targetIdObj) {
      if (sourceIds.includes(targetId)) {
        throw new BadRequestException('Cannot move item into itself');
      }
      const targetItem = await this.findOwnedItem(targetIdObj, wsObjectId);
      if (!targetItem || targetItem.itemType !== 'Folder') {
        throw new BadRequestException('Invalid target folder');
      }
      targetPath = targetItem.path;
      targetDepth = targetItem.depth;

      // 순환 이동 방지 로직 (부모 폴더를 자식 폴더 안으로 이동 불가)
      const sourceItems = await this.itemModel.find({
        _id: { $in: sourceIds },
        workspace: wsObjectId,
      });
      const isInvalidMove = sourceItems.some(
        (src) =>
          src.itemType === 'Folder' && targetPath.startsWith(`${src.path}/`),
      );
      if (isInvalidMove) {
        throw new BadRequestException('Cannot move item into its descendant');
      }
    }

    // 각각의 소스 아이템 이동 처리
    for (const sourceId of sourceIds) {
      const sourceItem = await this.findOwnedItem(sourceId, wsObjectId);
      if (!sourceItem) continue;

      const existingItem = await this.itemModel.findOne({
        workspace: wsObjectId,
        parentId: targetIdObj,
        name: sourceItem.name,
        _id: { $ne: sourceItem._id },
      });

      // 동일 이름 폴더 병합 로직
      if (
        existingItem &&
        existingItem.itemType === 'Folder' &&
        sourceItem.itemType === 'Folder'
      ) {
        const children = await this.itemModel.find({
          parentId: sourceItem._id,
          workspace: wsObjectId,
        });
        // 자식 전체를 동일 세션으로 배치 이동한다 (트랜잭션 공유)
        if (children.length > 0) {
          await this.applyMove(
            {
              workspaceId: wsObjectId.toString(),
              dragIds: children.map((child) => child._id.toString()),
              parentId: existingItem._id.toString(),
            },
            session,
          );
        }
        await this.itemModel.deleteOne(
          { _id: sourceItem._id, workspace: wsObjectId },
          { session },
        );
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

      sourceItem.parentId = targetIdObj;
      sourceItem.path = newPath;
      sourceItem.depth = targetDepth + 1;
      await sourceItem.save({ session });

      // 대상이 폴더면 하위 항목들도 일괄 업데이트 (정규식을 활용해 경로를 전부 바꿈)
      if (sourceItem.itemType === 'Folder') {
        const descendants = await this.itemModel.find({
          workspace: wsObjectId,
          path: { $regex: `^${oldPath}/` },
        });

        // 벌크로 업데이트
        const bulkOps = descendants.map((desc) => {
          const replacedPath = desc.path.replace(
            new RegExp(`^${oldPath}`),
            newPath,
          );
          // depth 갱신을 위해 '/' 갯수를 카운트 (간단한 산술계산)
          const newDescDepth = replacedPath.split('/').length - 1;

          return {
            updateOne: {
              filter: { _id: desc._id },
              update: { $set: { path: replacedPath, depth: newDescDepth } },
            },
          };
        });
        if (bulkOps.length > 0) {
          await this.itemModel.bulkWrite(bulkOps, { session });
        }
      }
    }
    return { isSuccess: true };
  }

  async renameItem(
    workspaceId: string,
    body: RenameItemDto,
  ): Promise<{ isSuccess: boolean }> {
    const { itemId, newName } = body;

    const wsObjectId = new Types.ObjectId(workspaceId);
    const item = await this.findOwnedItem(itemId, wsObjectId);
    if (!item) throw new NotFoundException('Item not found');

    await this.assertNameAvailable(
      wsObjectId,
      item.parentId,
      newName,
      item.itemType,
      item._id as Types.ObjectId,
    );

    const oldPath = item.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath =
      parentPath === '' ? `/${newName}` : `${parentPath}/${newName}`;

    // 이름 변경(item.save)과 하위 경로 일괄 갱신(bulkWrite)을 원자적으로 처리한다
    return this.txService.withTransaction(async (session) => {
      item.name = newName;
      item.path = newPath;
      await item.save({ session });

      if (item.itemType === 'Folder') {
        const descendants = await this.itemModel.find({
          workspace: wsObjectId,
          path: { $regex: `^${oldPath}/` },
        });

        const bulkOps = descendants.map((desc) => {
          const replacedPath = desc.path.replace(
            new RegExp(`^${oldPath}`),
            newPath,
          );
          return {
            updateOne: {
              filter: { _id: desc._id },
              update: { $set: { path: replacedPath } },
            },
          };
        });

        if (bulkOps.length > 0) {
          await this.itemModel.bulkWrite(bulkOps, { session });
        }
      }
      return { isSuccess: true };
    });
  }

  async updateItem(
    body: UpdateItemDto,
    workspaceId: string,
  ): Promise<{ isSuccess: boolean; item: FileBrowserItem | undefined }> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const item = await this.findOwnedItem(body.itemId, wsObjectId);
    if (!item) throw new NotFoundException('Item not found');

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
    return { isSuccess: true, item };
  }

  async deleteItems(
    workspaceId: string,
    itemIds: string[],
  ): Promise<{ isSuccess: boolean }> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    // 대상 항목과 하위 항목 삭제를 원자적으로 처리한다 (부모만 삭제되고 자식이 남는 상태 방지)
    return this.txService.withTransaction(async (session) => {
      for (const targetId of itemIds) {
        const item = await this.findOwnedItem(targetId, wsObjectId);
        if (!item) continue;

        // 대상 항목 먼저 삭제
        await this.itemModel.deleteOne(
          { _id: item._id, workspace: wsObjectId },
          { session },
        );

        // 폴더라면 하위의 모든 항목도 정규식 기반으로 삭제 처리
        if (item.itemType === 'Folder') {
          await this.itemModel.deleteMany(
            {
              workspace: wsObjectId,
              path: { $regex: `^${item.path}/` },
            },
            { session },
          );
        }
      }
      return { isSuccess: true };
    });
  }
}
