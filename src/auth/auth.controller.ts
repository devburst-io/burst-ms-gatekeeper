import { AuthGuard as CustomGuard } from '@devburst-io/burst-lib-commons';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtResponseDto } from './dto/jwt-response.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @UseGuards(LocalAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Login successful', type: JwtResponseDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Password reset email sent' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.userService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Password reset successful' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.userService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token for a session' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Token refreshed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  //@UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.CREATED)
  async refreshToken(@Request() req): Promise<any> {
    return this.authService.refreshToken(req.user.sessionId, req.user);
  }

  @Get('config/pub')
  async getPublicKey() {
    return this.authService.cryptoHelper.getPublicKey();
  }

  @MessagePattern({ role: 'auth', cmd: 'check' })
  async loggedIn(data: any) {
    try {
      const res = await this.authService.validateToken(data.jwt);

      return res;
    } catch (error) {
      throw error;
    }
  }
}