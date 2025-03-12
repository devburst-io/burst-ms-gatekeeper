import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { welcomeTemplate } from './templates/welcome.template';

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
} 