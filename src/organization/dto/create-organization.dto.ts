import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateOrganizationDto {
    @IsString()
    @MinLength(3)
    @IsNotEmpty()
    name: string;

    @IsString()
    description: string;
}
