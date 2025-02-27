import { OrganizationRole, PaginetedResponse } from '@devburst-io/burst-lib-commons';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization.member.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>
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

  async addMember(organizationId: string, addMemberDto: AddMemberDto, requestingUser: User) {
    const organization = await this.findOne(organizationId);

    const requesterMembership = await this.memberRepository.findOne({
      where: {
        organization: { id: organizationId },
        user: { id: requestingUser.id },
      }
    });

    if (!requesterMembership || requesterMembership.role !== OrganizationRole.Owner) {
      throw new ForbiddenException('Only organization owners can add members');
    }

    const userToAdd = await this.userRepository.findOne({
      where: { email: addMemberDto.email }
    });

    if (!userToAdd) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found`);
    }

    const existingMembership = await this.memberRepository.findOne({
      where: {
        organization: { id: organizationId },
        user: { id: userToAdd.id }
      }
    });

    if (existingMembership) {
      throw new ForbiddenException('User is already a member of this organization');
    }

    const newMember = this.memberRepository.create({
      organization,
      user: userToAdd,
      role: addMemberDto.role
    });

    return this.memberRepository.save(newMember);
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

    return this.memberRepository.remove(membershipToRemove);
  }
}
