import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
})
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  nickname: string;

  @Prop({ type: String, default: null })
  password: string | null;

  @Prop({ type: String, default: 'local' })
  provider: string;

  @Prop({ type: String })
  dbRefreshToken: string | null;

  @Prop({ type: Date, default: null })
  isDeleted: Date | null;

  @Prop({ type: Date, default: null })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
