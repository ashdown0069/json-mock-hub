import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WorkspaceRoleDocument = HydratedDocument<WorkspaceRole>;

@Schema({
  timestamps: true,
})
export class WorkspaceRole {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  owner: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['owner', 'member'],
    required: true,
  })
  role: 'owner' | 'member';

  @Prop({
    required: true,
  })
  canCreate: boolean;

  @Prop({
    required: true,
  })
  canRename: boolean;

  @Prop({
    required: true,
  })
  canDelete: boolean;

  @Prop({
    required: true,
  })
  canMove: boolean;

  // 기존 워크스페이스의 role 문서에는 이 필드가 없으므로 default로 하위 호환 보장
  @Prop({
    required: true,
    default: true,
  })
  canUpdate: boolean;
}

export const WorkspaceRoleSchema = SchemaFactory.createForClass(WorkspaceRole);
