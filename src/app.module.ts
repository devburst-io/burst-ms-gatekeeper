import { Proto } from '@devburst-io/burst-lib-commons';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { Organization } from './organization/entities/organization.entity';
import { OrganizationMember } from './organization/entities/organization.member.entity';
import { OrganizationModule } from './organization/organization.module';
import { Session } from './session/entity/session.entity';
import { SessionModule } from './session/session.module';
import { User } from './user/entity/user.entity';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_CLIENT',
        transport: Transport.GRPC,
        options: {
          package: ['auth', 'organization'],
          protoPath: Proto.configFilePath,
          url: 'localhost:5000',
        },
      }
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASS', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'burst_gatekeeper'),
        synchronize: true,
        entities: [User, Session, Organization, OrganizationMember]
      }),
      inject: [ConfigService]
    }),
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
          from: '"Burst Gatekeeper" <>',
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
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    OrganizationModule,
    SessionModule,
    HealthModule,
    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
