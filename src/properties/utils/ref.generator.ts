import { Prisma, PrismaClient } from '@prisma/client';

/** A Prisma client or an interactive-transaction client. */
type RefClient = PrismaClient | Prisma.TransactionClient;

/** First sequence handed out for a prefix is FIRST_SEQ + 1 (i.e. 101). */
const FIRST_SEQ = 100;

/** "Residential Lease" → "RL". */
function toAcronym(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Escapes a string so it can be embedded literally in a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the reference prefix from the category and type names,
 * e.g. ("Residential Lease", "Apartment") → "SIP-ARL".
 * Missing names fall back to "XX" each.
 */
export function buildRefPrefix(
  categoryName?: string | null,
  typeName?: string | null,
): string {
  const catCode = categoryName ? toAcronym(categoryName) : 'XX';
  const typeCode = typeName ? toAcronym(typeName) : 'XX';
  return `SIP-${typeCode}${catCode}`;
}

/**
 * Returns the next free reference for a prefix: highest existing sequence + 1.
 *
 * Uses the highest number (not a count) so a deleted property leaves a gap
 * instead of making the generator hand out a number that already exists.
 * Only references matching exactly `PREFIX<digits>/` are considered, so
 * "SIP-AR" never picks up "SIP-ARL…" references.
 */
export async function nextRefForPrefix(
  client: RefClient,
  prefix: string,
): Promise<string> {
  const rows = await client.property.findMany({
    where: { referenceNumber: { startsWith: prefix } },
    select: { referenceNumber: true },
  });

  const exact = new RegExp(`^${escapeRegExp(prefix)}(\\d+)/$`);
  const highest = rows.reduce((max, { referenceNumber }) => {
    const match = exact.exec(referenceNumber);
    return match ? Math.max(max, Number(match[1])) : max;
  }, FIRST_SEQ);

  return `${prefix}${highest + 1}/`;
}

/**
 * Resolves the category/type names and returns the next free reference.
 * Used both for the form preview and, inside the create transaction,
 * for the reference that is actually saved.
 */
export async function generateRef(
  client: RefClient,
  categoryId: number,
  typeId: number,
): Promise<string> {
  const [category, type] = await Promise.all([
    client.category.findUnique({ where: { id: categoryId } }),
    client.type.findUnique({ where: { id: typeId } }),
  ]);

  return nextRefForPrefix(client, buildRefPrefix(category?.name, type?.name));
}
