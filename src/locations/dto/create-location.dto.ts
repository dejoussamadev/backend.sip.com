import { IsString, IsNumber } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}
