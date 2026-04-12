import { PrismaClient } from '@prisma/client';

// Codes pour les catégories (basés sur le nom en DB)
const CAT_CODE: Record<string, string> = {
  'residential sales': 'RS',
  'residential rentals': 'RL',
  'commercial sales': 'CS',
  'commercial rentals': 'CL',
};

// Codes pour les types (basés sur le nom en DB)
const TYPE_CODE: Record<string, string> = {
  apartment: 'A',
  'compound villa': 'CV',
  'stand alone villa': 'SA',
  villa: 'V',
  penthouse: 'PH',
  townhouse: 'TH',
  office: 'OF',
  shop: 'SH',
  warehouse: 'WH',
  'whole building': 'WB',
  'labor camp': 'LC',
  land: 'LD',
};

export async function generateRef(
  prisma: PrismaClient,
  categoryId: number,
  typeId: number,
): Promise<string> {
  // Récupérer les noms depuis la DB
  const [category, type] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.type.findUnique({ where: { id: typeId } }),
  ]);

  const catName = category?.name?.toLowerCase() ?? '';
  const typeName = type?.name?.toLowerCase() ?? '';

  const catCode = CAT_CODE[catName] ?? 'XX';
  const typeCode = TYPE_CODE[typeName] ?? 'XX';

  const prefix = `SIP-${typeCode}${catCode}`;

  // Compter les properties existantes avec ce préfixe pour générer le numéro suivant
  const count = await prisma.property.count({
    where: { referenceNumber: { startsWith: prefix } },
  });

  const seq = String(100 + count + 1); // commence à 101, 102...
  return `${prefix}${seq}/`;
}
