import { CryptoHelper } from '@devburst-io/burst-lib-commons';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcrypt';
import { toMs } from 'ms-typescript';
import { Session } from 'src/session/entity/session.entity';
import { SessionService } from 'src/session/session.service';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {

  cryptoHelper: CryptoHelper

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService
  ) {
    this.cryptoHelper = new CryptoHelper({ configService })
  }

  async validateUser(email: string, encryptedPassword: string): Promise<any> {
    try {
      const user = await this.userService.findOne(email);
      const password = this.cryptoHelper.decryptData(encryptedPassword);

      if (compareSync(password, user?.password)) {
        return user;
      }

      return null;
    } catch (e) {
      Logger.log(e);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  async login(user) {
    const data = { ...user, password: undefined };
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    try {
      const session = await this.sessionService.create({
        user,
        hash,
      });

      const { token, refreshToken, tokenExpires } = await this.getTokensData({
        user: data,
        sessionId: session.id,
        hash,
      });

      return {
        refreshToken,
        token,
        tokenExpires,
        data,
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid credentials");
    }

  }

  async validateToken(token) {
    const result = await this.jwtService.verifyAsync(
      token,
      {
        secret: this.configService.get<string>('JWT_SECRET', 'super-secret'),
      }
    )
    return result;
  }

  async refreshToken(sessionId: string, data) {
    const session = await this.sessionService.findById(sessionId);
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    if (!session)
      throw new UnauthorizedException();

    if (session.hash !== data.hash)
      throw new UnauthorizedException();

    const user = await this.userService.findOne(data.email);

    if (user.id !== session.user.id)
      throw new UnauthorizedException();

    await this.sessionService.update(session.id, { hash });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      sessionId: sessionId,
      hash: hash,
      user: user,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      data,
    };

  }

  private async getTokensData(data: {
    user: Partial<User>;
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.get<string>('JWT_EXPIRES', '2h');

    const tokenExpires = Date.now() + toMs(tokenExpiresIn);

    const token = await this.jwtService.signAsync(
      {
        user: data.user,
        sessionId: data.sessionId,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'super-secret'),
        expiresIn: tokenExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sessionId: data.sessionId,
        email: data.user.email,
        hash: data.hash,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET_REFRESH', 'super-secret'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_REFRESH', '365d'),
      },
    );

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
  }
}