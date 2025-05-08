import { Role } from '@devburst-io/burst-lib-commons';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Super User', required: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'super-user@gmail.com', required: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin', enum: Role, required: false, default: Role.Common })
  role: Role;

  @ApiProperty({ example: 'super-password', required: true })
  @IsNotEmpty()
  @IsString()
  password: string;
}
