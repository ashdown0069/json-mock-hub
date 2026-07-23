import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './users.schema';
import { Workspace } from './workspace.schema';

export type WorkspaceMembershipDocument = HydratedDocument<WorkspaceMembership>;
@Schema({ timestamps: true })
export class WorkspaceMembership {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: Types.ObjectId | User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Types.ObjectId | Workspace;

  @Prop({ type: String, default: 'member', required: true })
  role: 'owner' | 'member';

  @Prop({ type: Date, default: null })
  isDeleted: Date | null;
}

export const WorkspaceMembershipSchema =
  SchemaFactory.createForClass(WorkspaceMembership);
