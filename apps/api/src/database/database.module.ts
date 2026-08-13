import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TransactionService } from './transaction.service';
import { User, UserSchema } from './schema/users.schema';
import { Workspace, WorkspaceSchema } from './schema/workspace.schema';
import {
  WorkspaceMembership,
  WorkspaceMembershipSchema,
} from './schema/workspace-membership.schema';
import {
  WorkspaceRole,
  WorkspaceRoleSchema,
} from './schema/workspace-role.schema';
import {
  FileBrowserItem,
  FileBrowserItemSchema,
} from './schema/file-browser-item.schema';
import { RequestLog, RequestLogSchema } from './schema/request-log.schema';
import type { Connection, Schema } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection: Connection) => {
          connection.plugin((schema: Schema) => {
            schema.set('toJSON', {
              virtuals: true,
              versionKey: false,
              // doc은 mongoose가 문맥으로 타입을 주므로 주석을 달지 않는다.
              // ret에만 Record를 달아 _id/__v 삭제가 통과하게 한다.
              transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
              },
            });
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: WorkspaceMembership.name, schema: WorkspaceMembershipSchema },
      { name: WorkspaceRole.name, schema: WorkspaceRoleSchema },
      { name: FileBrowserItem.name, schema: FileBrowserItemSchema },
      { name: RequestLog.name, schema: RequestLogSchema },
    ]),
  ],
  providers: [TransactionService],
  exports: [MongooseModule, TransactionService],
})
export class DatabaseModule {}
