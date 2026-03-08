import { IsString } from 'class-validator';

export class CreateLayoutDto {
  @IsString()
  name: string;
}
