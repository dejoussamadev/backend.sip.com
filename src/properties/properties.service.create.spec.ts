import { ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PropertiesService } from './properties.service';

/**
 * Regression tests for duplicate reference numbers on property creation.
 *
 * Previously the server trusted the `refNo` preview sent by the form and let
 * Prisma's unique-constraint error (P2002) bubble up as a 500, which sent the
 * user to the full-page error screen and lost the form.
 */
describe('PropertiesService.create — reference numbers', () => {
  /** Prisma unique-constraint error, as thrown by the client. */
  const uniqueError = (field: string) =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: [field] },
    });

  let existingRefs: string[];
  let tx: any;
  let prisma: any;
  let notifications: { notify: jest.Mock };
  let service: PropertiesService;

  beforeEach(() => {
    existingRefs = ['SIP-ARL101/', 'SIP-ARL116/'];

    // Transaction client: references are read and the property is written here.
    tx = {
      category: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Residential Lease' }),
      },
      type: { findUnique: jest.fn().mockResolvedValue({ name: 'Apartment' }) },
      property: {
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            existingRefs
              .filter((r) => r.startsWith(where.referenceNumber.startsWith))
              .map((referenceNumber) => ({ referenceNumber })),
          ),
        ),
        create: jest.fn(({ data }) => Promise.resolve({ id: 99, ...data })),
      },
      propertyFacility: { createMany: jest.fn() },
      propertyUtility: { createMany: jest.fn() },
    };

    prisma = { $transaction: jest.fn((cb: (t: any) => unknown) => cb(tx)) };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new PropertiesService(prisma, notifications as any, {} as any);
  });

  /** Minimal create payload; `refNo` is the (stale) preview from the form. */
  const dto = () =>
    ({
      name: 'Zone 44 Building',
      categoryId: 1,
      typeId: 2,
      refNo: 'SIP-ARL116/',
    }) as any;

  it('ignores the client refNo and generates the reference on save', async () => {
    const property = await service.create(dto(), 'Agent', Role.ADMIN, 1);

    expect(property.referenceNumber).toBe('SIP-ARL117/');
    expect(tx.property.create.mock.calls[0][0].data.referenceNumber).toBe(
      'SIP-ARL117/',
    );
  });

  it('retries with a fresh reference when another create takes it first', async () => {
    // First attempt collides (a concurrent create grabbed 117), second succeeds.
    tx.property.create.mockImplementationOnce(() => {
      existingRefs.push('SIP-ARL117/');
      return Promise.reject(uniqueError('referenceNumber'));
    });

    const property = await service.create(dto(), 'Agent', Role.ADMIN, 1);

    expect(property.referenceNumber).toBe('SIP-ARL118/');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('returns 409 Conflict (not 500) when every attempt collides', async () => {
    tx.property.create.mockRejectedValue(uniqueError('referenceNumber'));

    await expect(
      service.create(dto(), 'Agent', Role.ADMIN, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('does not swallow unique errors on other fields', async () => {
    const otherError = uniqueError('someOtherField');
    tx.property.create.mockRejectedValue(otherError);

    await expect(service.create(dto(), 'Agent', Role.ADMIN, 1)).rejects.toBe(
      otherError,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
