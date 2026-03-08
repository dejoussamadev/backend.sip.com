import { IsString } from 'class-validator';

export class CreateFacilityDto {
  @IsString()
  name: string;
}
