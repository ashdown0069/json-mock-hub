import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GetUserDto {
  @Expose()
  email: string;

  @Expose()
  nickname: string;
}
