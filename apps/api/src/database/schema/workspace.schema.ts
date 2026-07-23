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

  // MCP 등 외부 클라이언트 인증용 API 키. 웹에서 상시 조회해 자동 주입해야 하므로 평문 저장
  // (기본 조회에서 제외하기 위해 select: false 유지)
  @Prop({ type: String, default: null, select: false })
  apiKey: string | null;

  @Prop({ type: Date, default: null })
  apiKeyIssuedAt: Date | null;

  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
