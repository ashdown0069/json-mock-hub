import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class GetWorkspaceDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  membersCount: number;

  @Expose()
  @Transform(({ obj }) => obj.owner?.toString())
  owner: string;

  @Expose()
  createdAt: Date;
}
