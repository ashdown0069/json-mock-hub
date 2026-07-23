import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUserDto } from './dto/res/get-user.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Serialize(GetUserDto)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUserId() userId: string) {
    const user = await this.usersService.findById(userId);
    return user;
  }
}
