import { AuthGuard } from '@devburst-io/burst-lib-commons';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile, Res, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiNoContentResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req) {
    return this.organizationService.create(createOrganizationDto, req.user);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get organization by id' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req
  ) {
    return this.organizationService.update(id, updateOrganizationDto, req.user);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get user organizations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  userOrganizations(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('pageSize') pageSize: number = 10
  ) {
    return this.organizationService.getUserOrganizations(req.user, page, pageSize);
  }

  @Post(':id/members')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Add member to organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  addMember(
    @Param('id') organizationId: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req
  ) {
    return this.organizationService.addMember(organizationId, addMemberDto, req.user);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID to remove' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  removeMember(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @Request() req
  ) {
    return this.organizationService.removeMember(organizationId, memberId, req.user);
  }

  @Post('invitations/accept')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Aceitar convite para organização' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async acceptInvitation(
    @Body('token') token: string,
    @Request() req
  ) {
    return this.organizationService.acceptInvitation(token, req.user);
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Obter imagem da organização' })
  @ApiParam({ name: 'id', description: 'ID da Organização' })
  @ApiResponse({ status: 200, description: 'Imagem encontrada' })
  @ApiResponse({ status: 404, description: 'Imagem não encontrada' })
  async getImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.organizationService.getImage(id);
    res.setHeader('Content-Type', image.mimetype);
    res.send(image.data);
  }

  @Post(':id/image')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Fazer upload de imagem da organização' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID da Organização' })
  @ApiResponse({ status: 200, description: 'Imagem atualizada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Organização não encontrada' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    return this.organizationService.uploadImage(id, file, req.user);
  }
}