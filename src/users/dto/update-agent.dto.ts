import { PartialType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
