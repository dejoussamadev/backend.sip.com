import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLayoutDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
