import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

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

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  schema?: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  json?: any;

  @Prop({
    type: {
      pagination: { type: Boolean, default: false },
      paginationParams: {
        pageParam: { type: String },
        limitParam: { type: String },
      },
    },
    default: null,
  })
  options?: any;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  fieldDefs?: any;

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
