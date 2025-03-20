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
import { OrganizationInvitation } from 'src/organization/entities/organization-invitation.entity';
import { hash } from 'bcrypt';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { addHours } from 'date-fns';

@Injectable()
export class UserService {

  cryptoHelper: CryptoHelper

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly organizationService: OrganizationService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepository: Repository<OrganizationInvitation>,
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

      // Verifica convites pendentes
      const pendingInvitations = await this.invitationRepository.find({
        where: {
          email: user.email,
          accepted: false
        },
        relations: ['organization']
      });

      // Adiciona o usuário às organizações dos convites pendentes
      for (const invitation of pendingInvitations) {
        await this.organizationService.addMemberDirectly(
          invitation.organizationId,
          userSaved.id
        );
        
        invitation.accepted = true;
        await this.invitationRepository.save(invitation);
      }

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
      const resetToken = await this.resetTokenRepository.findOne({
        where: {
          token: resetPasswordDto.token,
          used: false
        },
        relations: ['user']
      });

      if (!resetToken) {
        throw new BadRequestException('Token inválido ou já utilizado');
      }

      if (new Date() > resetToken.expiresAt) {
        throw new BadRequestException('Token expirado');
      }

      const existingUser = await this.userRepository.findOne(
        {
          where: [
            { email: resetToken.user.email }
          ]
        }
      );

      const decryptedPassword = this.cryptoHelper.decryptData(resetPasswordDto.newPassword);
      existingUser.password = decryptedPassword;

      // Marca o token como usado
      resetToken.used = true;

      // Salva as alterações
      await this.resetTokenRepository.save(resetToken);
      const updatedUser = await this.userRepository.save(existingUser);

      return { ...updatedUser, password: undefined };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao resetar a senha');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: forgotPasswordDto.email } });
    if (!user) {
      return;
    }

    // Gera um token único
    const token = this.jwtService.sign(
      { type: 'password_reset' },
      { 
        secret: this.configService.get<string>('JWT_RESET_SECRET', 'super-secret'),
        expiresIn: '2h'
      }
    );

    // Salva o token no banco
    const resetToken = this.resetTokenRepository.create({
      token,
      userId: user.id,
      expiresAt: addHours(new Date(), 2)
    });
    await this.resetTokenRepository.save(resetToken);

    const resetLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    try {
      Logger.log('Tentando enviar email para:', user.email);
      Logger.log('Reset link:', resetLink);
      
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

      Logger.log('Email enviado:', mail);
    } catch (error) {
      Logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }
}
