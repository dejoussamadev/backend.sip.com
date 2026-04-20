import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFurnishingDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
