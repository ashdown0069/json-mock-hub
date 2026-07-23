import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type RequestLogDocument = HydratedDocument<RequestLog>;

@Schema({
  collection: 'requestlogs',
  timestamps: { createdAt: true, updatedAt: false },
})
export class RequestLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true })
  method: string;

  @Prop({ type: String, required: true })
  path: string;

  @Prop({ type: Number, required: true })
  status: number;

  @Prop({ type: String, default: null })
  ip: string | null;

  createdAt: Date;
}

export const RequestLogSchema = SchemaFactory.createForClass(RequestLog);

// 대시보드 조회용 복합 인덱스
RequestLogSchema.index({ workspace: 1, createdAt: -1 });

// TTL 인덱스 (30일 보존)
RequestLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);
