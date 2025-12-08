import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    const { password, ...result } = user;
    return result;
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateData: any) {
    const { password, email, role, ...allowedData } = updateData;
    const updatedUser = await this.usersService.update(
      req.user.id,
      allowedData,
    );
    const { password: _, ...result } = updatedUser;
    return result;
  }
}
