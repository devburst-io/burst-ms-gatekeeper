import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}