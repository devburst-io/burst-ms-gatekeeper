import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { OrganizationRole } from '@devburst-io/burst-lib-commons';

export class AddMemberDto {
  @ApiProperty({ description: 'Email do usuário a ser convidado' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Nome do usuário (opcional)', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Papel do usuário na organização', enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}
