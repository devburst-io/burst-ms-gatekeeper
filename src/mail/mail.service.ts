import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { welcomeTemplate } from './templates/welcome.template';

interface SendOrganizationInviteParams {
  email: string;
  name?: string;
  organizationName: string;
  inviteLink: string;
  inviterName: string;
}

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail(email: string, name: string) {
    const from = this.configService.get<string>('SMTP_USER', '');
    
    const mail = await this.mailerService.sendMail({
      to: email,
      from,
      subject: 'Bem-vindo à Monitoro!',
      html: welcomeTemplate(name),
    });

    console.log('Email enviado:', mail);

    return mail;
  }

  async sendOrganizationInvite(params: SendOrganizationInviteParams) {
    const { email, name, organizationName, inviteLink, inviterName } = params;
    const from = this.configService.get<string>('SMTP_USER', '');

    await this.mailerService.sendMail({
      to: email,
      from,
      subject: `Convite para participar da organização ${organizationName}`,
      template: 'organization-invite',
      context: {
        name: name || email,
        organizationName,
        inviteLink,
        inviterName
      }
    });
  }
} 