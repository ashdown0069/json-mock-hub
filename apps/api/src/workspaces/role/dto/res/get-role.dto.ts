import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class GetRoleDto {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.workspace.toString())
  workspace: string;

  @Expose()
  role: 'owner' | 'member';

  @Expose()
  canCreate: boolean;

  @Expose()
  canRename: boolean;

  @Expose()
  canMove: boolean;

  @Expose()
  canDelete: boolean;

  @Expose()
  canUpdate: boolean;
}
