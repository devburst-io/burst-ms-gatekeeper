import { AuthGuard, Paginated, Role, Roles, RolesGuard } from '@devburst-io/burst-lib-commons';
import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { Session } from './entity/session.entity';

@Controller('/sessions')
@ApiTags('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService
  ) { }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page' })
  @Paginated(Session)
  findAll(
    @Request() req,
    @Query('page', ParseIntPipe, new DefaultValuePipe(1)) page: number = 1,
    @Query('pageSize', ParseIntPipe, new DefaultValuePipe(10)) pageSize: number = 10
  ) {
    return this.sessionService.findByUserId(req.user.id, page, pageSize);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout a session' })
  @ApiParam({ name: 'id', type: String, description: 'Session ID' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  delete(@Param('id') id: string) {
    return this.sessionService.delete(id);
  }
}
