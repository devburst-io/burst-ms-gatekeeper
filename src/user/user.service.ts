import { CryptoHelper, PaginetedResponse, Role } from '@devburst-io/burst-lib-commons';
import { MailerService } from '@nestjs-modules/mailer';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import generator from 'generate-password-ts';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { OrganizationService } from 'src/organization/organization.service';
import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {

  cryptoHelper: CryptoHelper

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService
  ) {
    this.cryptoHelper = new CryptoHelper({ configService })
  }

  async findAll(page, pageSize): Promise<PaginetedResponse<User>> {
    const query = this.userRepository.createQueryBuilder();
    query
      .select()
      .orderBy('"createdAt"', "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const result = (await query.getRawAndEntities()).entities;

    return new PaginetedResponse<User>({
      items: result,
      page: page,
      pageSize: pageSize,
      itemCount: await query.getCount()
    });
  }

  async findOne(email: string): Promise<Partial<User>> {
    const user = await this.userRepository
      .createQueryBuilder()
      .addSelect("User.password")
      .where("User.email = :email", { email })
      .getOne()

    user.organizations = (await this.organizationService.getUserOrganizations(user, 1, 999)).items
      .map(org => ({
        id: org.id,
        name: org.name,
        description: org.description,
      }));

    return user;
  }

  async create(user: Partial<User>): Promise<ObjectLiteral> {
    try {
      user.password = this.cryptoHelper.decryptData(user.password);
      const existingUser = await this.userRepository.findOne(
        {
          where: [
            { email: user.email }
          ]
        }
      );
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      user.role = Role.Common;
      const userEntity = this.userRepository.create(user);
      const res = await this.userRepository.save(userEntity);
      const userSaved = { ...res, password: undefined };

      return userSaved;
    } catch (e) {
      if (e instanceof QueryFailedError) {
        if (e.message.includes('duplicate key value violates unique constraint "email"')) {
          throw new ConflictException('Email already exists');
        }
      }
      Logger.error(e);
      throw e;
    }
  }

  async resetPassword(userId: string, user: Partial<User>): Promise<Partial<User>> {
    try {
      user.password = this.cryptoHelper.decryptData(user.password);
      const resp = await this.userRepository.findOne({ where: { id: userId } });
      if (!resp) {
        throw new NotFoundException('User not found');
      }

      resp.password = user.password;
      const updatedUser = await this.userRepository.save(resp);
      return { ...updatedUser, password: undefined }
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<Partial<User>> {
    try {
      const user = await this.userRepository.findOne(
        {
          where: [
            { email: dto.email }
          ]
        }
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const password = generator.generate({
        length: 15,
        numbers: true
      });

      user.password = password

      this.mailerService
        .sendMail({
          to: user.email,
          from: 'rafael@karc.io',
          subject: 'Password Reset',
          html: `<b>Your new password is ${password} </b>`,
        }).catch((e) => { Logger.error(`Mailer => ${e}`) });

      const updatedUser = await this.userRepository.save(user)
      return { ...updatedUser, password: undefined }
    } catch (e) {
      Logger.error(e);
      throw e;
    }
  }
}
