import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DashboardStatsDto {
  @Expose() totalRoutes: number;
  @Expose() requestVolume24h: number;
}
