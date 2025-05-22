import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { GrpcDateInterceptor } from '../interceptors/grpc-date.interceptor';

@Controller()
@UseInterceptors(GrpcDateInterceptor)
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @GrpcMethod('AuthService', 'CheckLoggedIn')
  async loggedIn(data: { jwt: string }) {
    this.logger.log(`[GRPC] CheckLoggedIn ${data.jwt.slice(0, 10)}...`);
    const res = await this.authService.validateToken(data.jwt);
    return { isValid: !!res, sessionId: res?.sessionId || '', user: res?.user || {} };
  }

  @GrpcMethod('Health', 'Check')
  healthCheck({ service }: { service: string }) {
    this.logger.log(`[GRPC] Health`);
    return { status: 'up' };
  }

  @GrpcMethod('User', 'GetById')
  async getUser(data: { id: string }) {
    this.logger.log(`[GRPC] GetUser ${data.id}`);
    const res = await this.authService.getUser(data.id);
    return res || {};
  }
}