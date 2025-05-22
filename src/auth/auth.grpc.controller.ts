import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @GrpcMethod('AuthService', 'CheckLoggedIn')
  async loggedIn(data: { jwt: string }) {
    const res = await this.authService.validateToken(data.jwt);
    return { isValid: !!res, sessionId: res?.sessionId || '', user: res?.user || {} };
  }

  @GrpcMethod('Health', 'Check')
  healthCheck({ service }: { service: string }) {
    return { status: 'up' };
  }

  @GrpcMethod('User', 'GetById')
  async getUser(data: { id: string }) {
    const res = await this.authService.getUser(data.id);
    return res || {};
  }
}