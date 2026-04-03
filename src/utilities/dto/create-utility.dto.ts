import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUtilityDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
