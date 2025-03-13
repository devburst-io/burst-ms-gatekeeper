import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization.member.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationGrpcController } from './organization.grpc.controller';
import { OrganizationService } from './organization.service';
import { Proto } from '@devburst-io/burst-lib-commons';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    MailModule,
    TypeOrmModule.forFeature([Organization, OrganizationMember, User, OrganizationInvitation]),
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
        },
      ]
    }),
  ],
  controllers: [OrganizationController, OrganizationGrpcController],
  providers: [OrganizationService],
  exports: [OrganizationService]
})
export class OrganizationModule { }
