import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateAgentDto } from './create-agent.dto';
import { UpdateAgentDto } from './update-agent.dto';

/**
 * Regression tests for the "admin edit silently demotes users" bug.
 *
 * `UpdateAgentDto` is built with `PartialType(CreateAgentDto)`, and
 * `PartialType` copies property initializers (`= value`) from the base class.
 * Any default declared on `CreateAgentDto` was therefore injected into every
 * PATCH /agents/:id body, overwriting fields the admin never touched
 * (role → AGENT, isActive → true, bookmarkLimit → 50).
 */
describe('UpdateAgentDto', () => {
  /**
   * Mirrors the global pipe options from `errors.module.ts` (minus the custom
   * catalog exception factory, which only changes the error shape).
   */
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  /**
   * Runs a raw request body through the pipe exactly like Nest does for an
   * `@Body()` parameter typed with the given DTO class.
   */
  const transformBody = (body: Record<string, unknown>, metatype: new () => object) =>
    pipe.transform(body, { type: 'body', metatype } as ArgumentMetadata);

  /**
   * Keys whose value is not `undefined`. With the ES2023 target, TypeScript
   * defines every declared class field (e.g. `password?: string`) as an own
   * property set to `undefined`; Prisma skips those, so only defined keys
   * are actually written to the database.
   */
  const definedKeys = (obj: object) =>
    Object.entries(obj)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

  it('keeps only the fields actually sent (no injected defaults)', async () => {
    const dto = await transformBody({ bookmarkLimit: 10 }, UpdateAgentDto);

    // Only the edited field may reach the service / Prisma update.
    expect(definedKeys(dto)).toEqual(['bookmarkLimit']);
    expect(dto).toMatchObject({ bookmarkLimit: 10 });
  });

  it('does not inject role, isActive or bookmarkLimit when editing other fields', async () => {
    const dto = await transformBody({ name: 'Renamed' }, UpdateAgentDto);

    expect(definedKeys(dto)).toEqual(['name']);
    expect(definedKeys(dto)).not.toEqual(
      expect.arrayContaining(['role', 'isActive', 'bookmarkLimit']),
    );
  });

  it('rejects role on update (role can only be set at creation)', async () => {
    await expect(transformBody({ role: 'ADMIN' }, UpdateAgentDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('CreateAgentDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  /** Minimal valid create payload shared by the tests below. */
  const baseBody = {
    name: 'New Admin',
    email: 'new.admin@sip.test',
    password: 'Secret123',
    mobile: '50000000',
    countryCode: '+974',
    designation: 'Admin',
  };

  it('still accepts an explicit role at creation', async () => {
    const dto = await pipe.transform(
      { ...baseBody, role: 'ADMIN' },
      { type: 'body', metatype: CreateAgentDto } as ArgumentMetadata,
    );

    expect(dto.role).toBe('ADMIN');
  });
});
