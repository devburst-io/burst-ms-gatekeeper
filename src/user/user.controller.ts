import { AuthGuard, Paginated, Role, Roles, RolesGuard } from '@devburst-io/burst-lib-commons';
import { Body, Controller, Get, ParseIntPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Controller('/users')
@ApiTags('users')
export class UserController {
  constructor(
    private readonly userService: UserService
  ) { }

  @MessagePattern({ role: 'user', cmd: 'get' })
  getUser(data: any): Promise<Partial<User>> {
    return this.userService.findOne(data.email);
  }

  @Get()
  @Roles(Role.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all users' })
  @Paginated(User)
  findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('pageSize') pageSize = 10) {
    return this.userService.findAll(page, pageSize);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: User })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() user: CreateUserDto) {
    return this.userService.create(user);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Success.', type: User })
  @ApiResponse({ status: 401 })
  async me(@Request() req): Promise<User | string> {
    return req.user;
  }
}
