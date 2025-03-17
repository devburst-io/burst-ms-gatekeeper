import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      Logger.error(`JwtRefreshGuard: Cabeçalho de autorização não encontrado`);
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET_REFRESH', 'super-secret'),
      });

      // Adiciona as informações do usuário e sessão ao request
      req['user'] = {
        email: payload.email,
        hash: payload.hash
      };
      req['sessionId'] = payload.sessionId;

      return true;
    } catch (error) {
      Logger.error(`JwtRefreshGuard erro: ${error.message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
} 