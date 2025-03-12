import { CryptoHelper, PaginetedResponse, Role } from '@devburst-io/burst-lib-commons';
import { MailerService } from '@nestjs-modules/mailer';
import { ConflictException, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import generator from 'generate-password-ts';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { OrganizationService } from 'src/organization/organization.service';
import { ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UserService {

  cryptoHelper: CryptoHelper

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

      // Enviar email de boas-vindas
      await this.mailService.sendWelcomeEmail(userSaved.email, userSaved.name);

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

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET', 'super-secret'),
      });

      const user = await this.userRepository.findOne({ where: { id: payload.userId } });
      if (!user) {
        throw new BadRequestException('Token inválido');
      }

      const hashedPassword = await this.cryptoHelper.encryptData(resetPasswordDto.newPassword);
      user.password = hashedPassword;
      const updatedUser = await this.userRepository.save(user);
      return { ...updatedUser, password: undefined };
    } catch (error) {
      throw new BadRequestException('Token inválido ou expirado');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: forgotPasswordDto.email } });
    if (!user) {
      return;
    }

    const token = this.jwtService.sign(
      { userId: user.id },
      { 
        secret: this.configService.get<string>('JWT_RESET_SECRET', 'super-secret'),
        expiresIn: '2h'
      }
    );

    const resetLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    try {
      console.log('Tentando enviar email para:', user.email);
      console.log('Reset link:', resetLink);
      
      const mail = await this.mailerService.sendMail({
        to: user.email,
        from: this.configService.get<string>('SMTP_USER', ''),
        subject: 'Redefinição de Senha',
        template: 'reset-password',
        context: {
          name: user.name,
          resetLink,
        },
      });

      console.log('Email enviado:', mail);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }
}
