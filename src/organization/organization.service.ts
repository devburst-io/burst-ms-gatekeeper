import { OrganizationRole, PaginetedResponse } from '@devburst-io/burst-lib-commons';
import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization.member.entity';
import { ApiNoContentResponse } from '@nestjs/swagger';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationInvitation)
    private invitationRepository: Repository<OrganizationInvitation>,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) { }

  async create(createOrganizationDto: CreateOrganizationDto, creator: User) {
    const organization = await this.organizationRepository.save(
      this.organizationRepository.create(createOrganizationDto)
    )

    await this.memberRepository.save(
      this.memberRepository.create({
        organization,
        user: creator,
        role: OrganizationRole.Owner
      })
    )

    return organization;
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where("organization.id = :id", { id })
      .getOne()

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async getUserOrganizations(user: User, page, pageSize) {
    const query = this.organizationRepository.createQueryBuilder('organization');
    query
      .leftJoinAndSelect('organization.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const result = (await query.getRawAndEntities()).entities;

    return new PaginetedResponse<Organization>({
      items: result,
      page: page,
      pageSize: pageSize,
      itemCount: await query.getCount()
    });
  }

  async validateMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.memberRepository.findOne({
      where: {
        organization: { id: organizationId },
        user: { id: userId }
      }
    });
  
    return !!membership;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto, requestingUser: User) {
    const organization = await this.findOne(id);

    const membership = await this.memberRepository.findOne({
      where: {
        organization: { id },
        user: { id: requestingUser.id }
      }
    });

    if (!membership || membership.role !== OrganizationRole.Owner) {
      throw new ForbiddenException('Only organization owners can update organization details');
    }

    Object.assign(organization, updateOrganizationDto);

    return this.organizationRepository.save(organization);
  }

  remove(id: number) {
    return `This action removes a #${id} organization`;
  }

  async addMember(organizationId: string, addMemberDto: AddMemberDto, currentUser: User) {
    const organization = await this.findOne(organizationId);
    
    if (!await this.isUserAdmin(organizationId, currentUser.id)) {
      throw new UnauthorizedException('Você não tem permissão para adicionar membros');
    }

    const existingMember = await this.memberRepository.findOne({
      where: { 
        organization: { id: organizationId },
        user: { email: addMemberDto.email }
      }
    });

    if (existingMember) {
      throw new ConflictException('Usuário já é membro desta organização');
    }

    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: addMemberDto.email,
        organizationId,
        accepted: false
      }
    });

    if (existingInvitation) {
      throw new ConflictException('Já existe um convite pendente para este email');
    }

    const token = this.jwtService.sign(
      { 
        email: addMemberDto.email,
        organizationId,
        name: addMemberDto.name,
        role: addMemberDto.role
      },
      {
        expiresIn: '7d',
        secret: this.configService.get('JWT_INVITATION_SECRET')
      }
    );

    const invitation = this.invitationRepository.create({
      email: addMemberDto.email,
      name: addMemberDto.name,
      organizationId,
      token,
      role: addMemberDto.role
    });

    await this.invitationRepository.save(invitation);

    const inviteLink = `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${token}`;
    
    await this.mailService.sendOrganizationInvite({
      email: addMemberDto.email,
      name: addMemberDto.name,
      organizationName: organization.name,
      inviteLink,
      inviterName: currentUser.name
    });

    return { message: 'Convite enviado com sucesso' };
  }

  async removeMember(organizationId: string, memberId: string, requestingUser: User) {
    const organization = await this.findOne(organizationId);

    const requesterMembership = await this.memberRepository.findOne({
      where: {
        organization: { id: organizationId },
        user: { id: requestingUser.id }
      }
    });

    if (!requesterMembership || requesterMembership.role !== OrganizationRole.Owner) {
      throw new ForbiddenException('Only organization owners can remove members');
    }

    const membershipToRemove = await this.memberRepository.findOne({
      where: {
        id: memberId,
        organization: { id: organizationId }
      }
    });

    if (!membershipToRemove) {
      throw new NotFoundException('Member not found in this organization');
    }

    const ownersCount = await this.memberRepository.count({
      where: {
        organization: { id: organizationId },
        role: OrganizationRole.Owner
      }
    });

    if (membershipToRemove.role === OrganizationRole.Owner && ownersCount <= 1) {
      throw new ForbiddenException('Cannot remove the last owner of the organization');
    }

    await this.memberRepository.remove(membershipToRemove);

    return ApiNoContentResponse();
  }

  async isUserAdmin(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.memberRepository.findOne({
      where: {
        organization: { id: organizationId },
        user: { id: userId },
        role: OrganizationRole.Owner
      }
    });

    return !!membership;
  }

  async acceptInvitation(token: string, user: User) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_INVITATION_SECRET')
      });

      const invitation = await this.invitationRepository.findOne({
        where: {
          token,
          accepted: false,
          email: user.email
        }
      });

      if (!invitation) {
        throw new BadRequestException('Convite não encontrado ou já utilizado');
      }

      const membership = await this.memberRepository.create({
        organization: { id: invitation.organizationId },
        user,
        role: invitation.role
      });

      await this.memberRepository.save(membership);
      
      invitation.accepted = true;
      await this.invitationRepository.save(invitation);

      return { message: 'Convite aceito com sucesso' };
    } catch (error) {
      throw new BadRequestException('Token inválido ou expirado');
    }
  }

  async addMemberDirectly(organizationId: string, userId: string, role: OrganizationRole = OrganizationRole.Member) {
    const membership = await this.memberRepository.create({
      organization: { id: organizationId },
      user: { id: userId },
      role
    });
    
    return this.memberRepository.save(membership);
  }
}
