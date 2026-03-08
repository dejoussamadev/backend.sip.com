import { IsString } from 'class-validator';

export class CreateUtilityDto {
  @IsString()
  name: string;
}
