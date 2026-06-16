import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { QATAR_LOCATIONS } from './seed-locations';
import {
  CATEGORIES,
  CATEGORY_TYPE_RELATIONS,
  FACILITIES,
  FURNISHINGS,
  LAYOUTS,
  TYPE_LAYOUT_RELATIONS,
  TYPES,
  UTILITIES,
} from './seed-data';

const prisma = new PrismaClient();

type NamedRecord = { id: number; name: string };
type NameMap = Record<string, NamedRecord>;

function toNameMap(records: NamedRecord[]): NameMap {
  return Object.fromEntries(records.map((r) => [r.name, r]));
}

/** Seed a list of simple name-only records. */
async function seedMany(
  label: string,
  names: string[],
  creator: (name: string) => Promise<NamedRecord>,
): Promise<{ records: NamedRecord[]; map: NameMap }> {
  console.log(`  → Seeding ${label}...`);
  const records = await Promise.all(names.map(creator));
  console.log(`  ✓ ${records.length} ${label}`);
  return { records, map: toNameMap(records) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PURGE
// ─────────────────────────────────────────────────────────────────────────────

async function purge(): Promise<void> {
  console.log('  → Purging existing data...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      property_utilities, property_facilities, properties,
      users, landlords,
      category_furnishings, category_types, type_layouts,
      furnishings, layouts, types, categories,
      locations, utilities, facilities
    RESTART IDENTITY CASCADE;
  `);
  console.log('  ✓ All tables purged');
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

async function seedTypeLayoutRelations(
  typeMap: NameMap,
  layoutMap: NameMap,
): Promise<void> {
  console.log('  → Seeding type-layout relations...');
  const pairs = Object.entries(TYPE_LAYOUT_RELATIONS).flatMap(
    ([typeName, layoutNames]) =>
      layoutNames.map((layoutName) => ({
        typeId: typeMap[typeName].id,
        layoutId: layoutMap[layoutName].id,
      })),
  );
  await Promise.all(pairs.map((data) => prisma.typeLayout.create({ data })));
  console.log(`  ✓ ${pairs.length} type-layout relations`);
}

async function seedCategoryTypeRelations(
  categoryMap: NameMap,
  typeMap: NameMap,
): Promise<void> {
  console.log('  → Seeding category-type relations...');
  const pairs = Object.entries(CATEGORY_TYPE_RELATIONS).flatMap(
    ([categoryName, typeNames]) =>
      typeNames.map((typeName) => ({
        categoryId: categoryMap[categoryName].id,
        typeId: typeMap[typeName].id,
      })),
  );
  await Promise.all(pairs.map((data) => prisma.categoryType.create({ data })));
  console.log(`  ✓ ${pairs.length} category-type relations`);
}

async function seedCategoryFurnishingRelations(
  categoryRecords: NamedRecord[],
  furnishingRecords: NamedRecord[],
): Promise<void> {
  console.log('  → Seeding category-furnishing relations...');
  const pairs = categoryRecords.flatMap((category) =>
    furnishingRecords.map((furnishing) => ({
      categoryId: category.id,
      furnishingId: furnishing.id,
    })),
  );
  await Promise.all(
    pairs.map((data) => prisma.categoryFurnishing.create({ data })),
  );
  console.log(`  ✓ ${pairs.length} category-furnishing relations`);
}

async function seedLocations(): Promise<void> {
  console.log('  → Seeding locations...');
  const records = await Promise.all(
    QATAR_LOCATIONS.map((name) => prisma.location.create({ data: { name } })),
  );
  console.log(`  ✓ ${records.length} locations`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdmins(): Promise<void> {
  console.log('  → Seeding admin accounts...');
  const password = await bcrypt.hash('Admin1234!', 12);

  const admins = [
    {
      name: 'Aymen',
      email: 'aymen@stepinproperty.qa',
      agentCode: 'ADM00001',
      designation: 'System Administrator',
    },
    {
      name: 'Noriene',
      email: 'noriene@stepinproperty.qa',
      agentCode: 'ADM00002',
      designation: 'System Administrator',
    },
  ];

  await Promise.all(
    admins.map((admin) =>
      prisma.user.create({
        data: {
          ...admin,
          password,
          mobile: '',
          countryCode: '+974',
          role: Role.ADMIN,
          isActive: true,
        },
      }),
    ),
  );

  console.log(`  ✓ ${admins.length} admin accounts`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding database (property settings + admins)...\n');

  await purge();

  // Property settings
  const { records: utilityRecords } = await seedMany(
    'utilities',
    UTILITIES,
    (name) => prisma.utility.create({ data: { name } }),
  );
  const { records: facilityRecords } = await seedMany(
    'facilities',
    FACILITIES,
    (name) => prisma.facility.create({ data: { name } }),
  );
  const { records: furnishingRecords } = await seedMany(
    'furnishings',
    FURNISHINGS,
    (name) => prisma.furnishing.create({ data: { name } }),
  );
  const { map: layoutMap } = await seedMany('layouts', LAYOUTS, (name) =>
    prisma.layout.create({ data: { name } }),
  );
  const { map: typeMap } = await seedMany('types', TYPES, (name) =>
    prisma.type.create({ data: { name } }),
  );

  await seedTypeLayoutRelations(typeMap, layoutMap);

  console.log('  → Seeding categories...');
  const categoryRecords = await Promise.all(
    CATEGORIES.map(({ name, kind }) =>
      prisma.category.create({ data: { name, kind } }),
    ),
  );
  const categoryMap = toNameMap(categoryRecords);
  console.log(`  ✓ ${categoryRecords.length} categories`);

  await seedCategoryTypeRelations(categoryMap, typeMap);
  await seedCategoryFurnishingRelations(categoryRecords, furnishingRecords);

  await seedLocations();

  // Admin accounts
  await seedAdmins();

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
