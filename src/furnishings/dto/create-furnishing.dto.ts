import { IsString } from 'class-validator';

export class CreateFurnishingDto {
  @IsString()
  name: string;
}
