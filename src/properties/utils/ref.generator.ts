import { PrismaClient } from '@prisma/client';

function toAcronym(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export async function generateRef(
  prisma: PrismaClient,
  categoryId: number,
  typeId: number,
): Promise<string> {
  const [category, type] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.type.findUnique({ where: { id: typeId } }),
  ]);

  const catCode = category?.name ? toAcronym(category.name) : 'XX';
  const typeCode = type?.name ? toAcronym(type.name) : 'XX';

  const prefix = `SIP-${typeCode}${catCode}`;

  const count = await prisma.property.count({
    where: { referenceNumber: { startsWith: prefix } },
  });

  const seq = String(100 + count + 1);
  return `${prefix}${seq}/`;
}
