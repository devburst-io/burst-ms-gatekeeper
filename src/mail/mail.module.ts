import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST', 'smtp.hostinger.com'),
          port: configService.get<number>('SMTP_PORT', 465),
          ignoreTLS: configService.get<boolean>('SMTP_IGNORE_SSL', false),
          secure: configService.get<boolean>('SMTP_SECURE', true),
          auth: {
            user: configService.get<string>('SMTP_USER', ''),
            pass: configService.get<string>('SMTP_PASS', ''),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>('SMTP_USER', '')}>`,
        },
        template: {
          dir: join(__dirname, 'mail/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService]
    }),
  ],
  providers: [
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {} 