import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Payload for PATCH /agents/:id (admin edits another user).
 *
 * - Every field is optional: only the fields sent are updated.
 * - `role` is omitted on purpose: a user's role is set at creation only.
 *   With `forbidNonWhitelisted`, sending `role` here returns 400 instead of
 *   silently changing (or resetting) it.
 */
export class UpdateAgentDto extends PartialType(
  OmitType(CreateAgentDto, ['role'] as const),
) {
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
