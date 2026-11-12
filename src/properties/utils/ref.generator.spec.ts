import { buildRefPrefix, generateRef, nextRefForPrefix } from './ref.generator';

/**
 * Builds a minimal Prisma-like client whose `property.findMany` returns the
 * given reference numbers, filtered by the `startsWith` prefix like Postgres.
 */
const clientWithRefs = (
  refs: string[],
  names = { category: 'Residential Lease', type: 'Apartment' },
) => ({
  category: {
    findUnique: jest.fn().mockResolvedValue({ name: names.category }),
  },
  type: { findUnique: jest.fn().mockResolvedValue({ name: names.type }) },
  property: {
    findMany: jest.fn(({ where }) =>
      Promise.resolve(
        refs
          .filter((r) => r.startsWith(where.referenceNumber.startsWith))
          .map((referenceNumber) => ({ referenceNumber })),
      ),
    ),
  },
});

describe('buildRefPrefix', () => {
  it('combines the type and category acronyms', () => {
    expect(buildRefPrefix('Residential Lease', 'Apartment')).toBe('SIP-ARL');
  });

  it('falls back to XX when a name is missing', () => {
    expect(buildRefPrefix(undefined, undefined)).toBe('SIP-XXXX');
  });
});

describe('nextRefForPrefix', () => {
  it('starts at 101 when the prefix has no properties yet', async () => {
    await expect(
      nextRefForPrefix(clientWithRefs([]) as any, 'SIP-ARL'),
    ).resolves.toBe('SIP-ARL101/');
  });

  it('uses highest + 1, not the count, so a deleted property cannot cause a duplicate', async () => {
    // 103 was deleted: count-based logic would return 108, which already exists.
    const refs = [
      'SIP-ARL101/',
      'SIP-ARL102/',
      'SIP-ARL104/',
      'SIP-ARL105/',
      'SIP-ARL106/',
      'SIP-ARL107/',
      'SIP-ARL108/',
    ];

    await expect(
      nextRefForPrefix(clientWithRefs(refs) as any, 'SIP-ARL'),
    ).resolves.toBe('SIP-ARL109/');
  });

  it('ignores longer prefixes that merely start with the same letters', async () => {
    // SIP-AR must not count SIP-ARL… references (old startsWith bug).
    const refs = ['SIP-AR101/', 'SIP-ARL150/', 'SIP-ARL151/'];

    await expect(
      nextRefForPrefix(clientWithRefs(refs) as any, 'SIP-AR'),
    ).resolves.toBe('SIP-AR102/');
  });

  it('ignores malformed references for the prefix', async () => {
    const refs = ['SIP-ARL101/', 'SIP-ARL-legacy', 'SIP-ARL999x/'];

    await expect(
      nextRefForPrefix(clientWithRefs(refs) as any, 'SIP-ARL'),
    ).resolves.toBe('SIP-ARL102/');
  });
});

describe('generateRef', () => {
  it('resolves names to a prefix and returns the next free reference', async () => {
    const client = clientWithRefs(['SIP-ARL101/', 'SIP-ARL116/']);

    await expect(generateRef(client as any, 1, 2)).resolves.toBe('SIP-ARL117/');
    expect(client.category.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(client.type.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
