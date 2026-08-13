import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type WorkspaceDocument = HydratedDocument<Workspace>;

@Schema({
  timestamps: true,
})
export class Workspace {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  password: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  owner: string;

  @Prop({ type: Date, default: null })
  isDeleted: Date | null;

  @Prop({ type: Number, default: 1 })
  membersCount: number;


  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
