import { PrismaClient } from '@prisma/client';
import { PropertyCategory, PropertyType } from '../constants/property.enums';

const CAT_CODE: Record<PropertyCategory, string> = {
  residential_sales: 'RS',
  residential_leasing: 'RL',
  commercial_sales: 'CS',
  commercial_leasing: 'CL',
};

const TYPE_CODE: Record<PropertyType, string> = {
  land: 'LD',
  labor_camp: 'LC',
  office_space: 'OF',
  retail_space: 'RT',
  warehouse: 'WH',
  whole_building: 'WB',
  whole_compound: 'WC',
  apartment: 'AP',
  compound_villa: 'CV',
  penthouse: 'PH',
  stand_alone_villa: 'SA',
  townhouse: 'TH',
  villa: 'VI',
};

export async function generateRef(prisma: PrismaClient, category: PropertyCategory, type: PropertyType) {
  const cat = CAT_CODE[category] || 'XX';
  const typ = TYPE_CODE[type] || 'XX';
  const prefix = `SIP-${typ}${cat}`;
  const count = await prisma.property.count({ where: { refNo: { startsWith: prefix } } });
  const seq = String(count + 1).padStart(3, '0'); // 101, 102...
  return `${prefix}${seq}/`;
}
