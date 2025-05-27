import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entity/session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Proto } from '@devburst-io/burst-lib-commons';
@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
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
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule { }
