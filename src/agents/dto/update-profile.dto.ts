import { IsString, IsOptional } from 'class-validator';


export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    mobile?: string;

    @IsString()
    @IsOptional()
    countryCode?: string;

    @IsString()
    @IsOptional()
    designation?: string;

    @IsString()
    @IsOptional()
    photo?: string;
}