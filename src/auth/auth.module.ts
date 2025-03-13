import { Proto } from "@devburst-io/burst-lib-commons";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization } from "src/organization/entities/organization.entity";
import { OrganizationMember } from "src/organization/entities/organization.member.entity";
import { OrganizationModule } from "src/organization/organization.module";
import { OrganizationService } from "src/organization/organization.service";
import { Session } from "src/session/entity/session.entity";
import { SessionModule } from "src/session/session.module";
import { SessionService } from "src/session/session.service";
import { JwtRefreshStrategy } from "src/strategies/jwt-refresh.strategy";
import { LocalStrategy } from "src/strategies/local.strategy";
import { User } from "src/user/entity/user.entity";
import { UserModule } from "src/user/user.module";
import { UserService } from "src/user/user.service";
import { AuthController } from "./auth.controller";
import { AuthGrpcController } from "./auth.grpc.controller";
import { AuthService } from "./auth.service";
import { MailModule } from "src/mail/mail.module";
import { OrganizationInvitation } from "src/organization/entities/organization-invitation.entity";

@Module({
  imports: [
    UserModule,
    ConfigModule,
    PassportModule,
    SessionModule,
    OrganizationModule,
    MailModule,
    TypeOrmModule.forFeature([User, Session, Organization, OrganizationMember, OrganizationInvitation]),
    ClientsModule.registerAsync({
      clients: [
        {
          name: 'AUTH_CLIENT',
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            transport: Transport.GRPC,
            options: {
              package: ['auth', 'organization'],
              protoPath: Proto.configFilePath,
              url: process.env.AUTH_MICROSERVICE_URL || `localhost:${configService.get<number>('TCP_PORT', 5000)}`,
            },
          }),
          inject: [ConfigService],
        }
      ]
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'super-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES', '2h')
        }
      }),
      inject: [ConfigService],
    })],
  controllers: [
    AuthController,
    AuthGrpcController
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtRefreshStrategy,
    UserService,
    SessionService,
    OrganizationService
  ],
})
export class AuthModule { }