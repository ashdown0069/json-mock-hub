import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

import type { FieldSchema } from '@workspace/types';

export type FileBrowserItemDocument = HydratedDocument<FileBrowserItem>;

@Schema({ timestamps: true, collection: 'filebrowseritems' })
export class FileBrowserItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: ['File', 'Folder'], required: true })
  itemType: 'File' | 'Folder';

  @Prop({ type: [Object], default: null })
  fields?: FieldSchema[] | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  json?: any;

  // 옵션 형태는 상류 ItemOptionsDto가 검증하므로 여기서는 제약하지 않는다.
  // 고정 서브도큐먼트로 선언하면 스키마에 없는 키(sort/search 등)가 캐스팅 단계에서 유실된다.
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  options?: any;

  @Prop({ type: String, default: '/' })
  path: string;

  @Prop({ type: Number, default: 0 })
  depth: number;

  @Prop({ type: Types.ObjectId, default: null })
  parentId: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export const FileBrowserItemSchema =
  SchemaFactory.createForClass(FileBrowserItem);
FileBrowserItemSchema.index({ workspace: 1, path: 1 });
FileBrowserItemSchema.index(
  {
    workspace: 1,
    parentId: 1,
    name: 1,
  },
  {
    unique: true,
  },
);
