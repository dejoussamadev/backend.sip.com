import {
  PrismaClient,
  PropertyStatus,
  PropertyAccess,
  PropertyView,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Commercial Leasing',
  'Commercial Sales',
  'Residential Leasing',
  'Residential Sales',
];

const TYPES = [
  'Apartment',
  'Compound Villa',
  'Labor Camp',
  'Land',
  'Office Space',
  'Penthouse',
  'Retail Space',
  'Standalone Villa',
  'Townhouse',
  'Villa',
  'Villa Partition',
  'Warehouse',
  'Whole Building',
  'Whole Compound',
];

const LAYOUTS = [
  '1BR',
  '2BR',
  '3BR',
  '4BR',
  '5BR',
  '6BR',
  '7BR',
  '8BR',
  '9BR',
  '10BR+',
  'Studio',
  'Mixed',
  'SQM SPACE',
];

const FURNISHINGS = [
  'Fitted - Furnished',
  'Fitted - Semi Furnished',
  'Fitted - Unfurnished',
  'Mixed',
  'Shell & Core',
];

const UTILITIES = [
  'Water & Electricity',
  'Internet',
  'District Cooling',
  'Service Charge',
  'Sewage',
];

const FACILITIES = [
  'Basketball Court',
  'BBQ Area',
  'Catering Service',
  'Cinema',
  'Cleaning Service',
  'Clubhouse',
  'Co-working Space',
  'Football Court',
  'Gym',
  'Jacuzzi',
  "Kid's Play Area",
  'Laundry Service',
  'Mosque',
  'Multi Purpose Hall',
  'Padel Court',
  'Private Pool',
  'Sauna',
  'Shared Pool',
  'Squash Court',
  'Steam Room',
  'Tennis Court',
];

// ─────────────────────────────────────────────────────────────────────────────
// RELATION MAPS  (name-based, resolved to IDs after seeding)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_TYPE_RELATIONS: Record<string, string[]> = {
  'Commercial Leasing': [
    'Labor Camp',
    'Land',
    'Office Space',
    'Retail Space',
    'Villa',
    'Warehouse',
    'Whole Building',
    'Whole Compound',
  ],
  'Commercial Sales': [
    'Labor Camp',
    'Land',
    'Office Space',
    'Retail Space',
    'Villa',
    'Warehouse',
    'Whole Building',
    'Whole Compound',
  ],
  'Residential Leasing': [
    'Apartment',
    'Compound Villa',
    'Land',
    'Penthouse',
    'Standalone Villa',
    'Townhouse',
    'Villa Partition',
    'Whole Building',
  ],
  'Residential Sales': [
    'Apartment',
    'Compound Villa',
    'Land',
    'Penthouse',
    'Standalone Villa',
    'Townhouse',
    'Villa Partition',
    'Whole Building',
  ],
};

const TYPE_LAYOUT_RELATIONS: Record<string, string[]> = {
  Apartment: ['1BR', '2BR', '3BR', '4BR', 'Studio'],
  'Compound Villa': [
    '2BR',
    '3BR',
    '4BR',
    '5BR',
    '6BR',
    '7BR',
    '8BR',
    '9BR',
    '10BR+',
  ],
  Land: ['SQM SPACE'],
  Penthouse: [
    '1BR',
    '2BR',
    '3BR',
    '4BR',
    '5BR',
    '6BR',
    '7BR',
    '8BR',
    '9BR',
    '10BR+',
  ],
  'Standalone Villa': [
    '1BR',
    '2BR',
    '3BR',
    '4BR',
    '5BR',
    '6BR',
    '7BR',
    '8BR',
    '9BR',
    '10BR+',
  ],
  Townhouse: ['1BR', '2BR', '3BR', '4BR', 'Mixed', 'Studio'],
  'Whole Compound': [
    '2BR',
    '3BR',
    '4BR',
    '5BR',
    '6BR',
    '7BR',
    '8BR',
    '9BR',
    '10BR+',
    'Mixed',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type NamedRecord = { id: number; name: string };
type NameMap<T extends NamedRecord> = Record<string, T>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSubset<T>(arr: T[], min = 0, max?: number): T[] {
  const count = faker.number.int({
    min,
    max: Math.min(max ?? arr.length, arr.length),
  });
  return faker.helpers.shuffle([...arr]).slice(0, count);
}

function toNameMap<T extends NamedRecord>(records: T[]): NameMap<T> {
  return Object.fromEntries(records.map((r) => [r.name, r]));
}

async function seedMany<T extends NamedRecord>(
  label: string,
  names: string[],
  creator: (name: string) => Promise<T>,
): Promise<{ records: T[]; map: NameMap<T> }> {
  console.log(`  → Seeding ${label}...`);
  const records = await Promise.all(names.map(creator));
  console.log(`  ✓ ${records.length} ${label}`);
  return { records, map: toNameMap(records) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function purge(): Promise<void> {
  console.log('  → Purging existing data...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      property_utilities, property_facilities, properties,
      agents, landlords,
      category_furnishings, category_types, type_layouts,
      furnishings, layouts, types, categories,
      locations, utilities, facilities
    RESTART IDENTITY CASCADE;
  `);
  console.log('  ✓ All tables purged');
}

async function seedTypeLayoutRelations(
  typeMap: NameMap<NamedRecord>,
  layoutMap: NameMap<NamedRecord>,
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
  categoryMap: NameMap<NamedRecord>,
  typeMap: NameMap<NamedRecord>,
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

async function seedLocations(): Promise<NamedRecord[]> {
  console.log('  → Seeding locations...');
  const records = await Promise.all(
    Array.from({ length: 15 }).map(() =>
      prisma.location.create({
        data: {
          name: faker.location.city(),
          longitude: parseFloat(faker.location.longitude().toString()),
          latitude: parseFloat(faker.location.latitude().toString()),
        },
      }),
    ),
  );
  console.log(`  ✓ ${records.length} locations`);
  return records;
}

async function seedAgents(): Promise<NamedRecord[]> {
  console.log('  → Seeding agents...');
  await prisma.agent.create({
    data: {
      name: 'Super Admin',
      agentCode: 'AGT_ADMIN',
      email: 'admin@stepinproperty.com',
      password: await bcrypt.hash('Admin@123456', 12),
      mobile: '12345678',
      countryCode: '+974',
      role: Role.ADMIN,
      isActive: true,
      photo: faker.image.avatar(),
    },
  });

  await Promise.all(
    Array.from({ length: 10 }, async (_, i) =>
      prisma.agent.create({
        data: {
          name: faker.person.fullName(),
          agentCode: `AGT${String(i + 1).padStart(5, '0')}`,
          email: faker.internet.email(),
          password: await bcrypt.hash('Agent@123456', 12),
          mobile: faker.phone.number(),
          countryCode: '+974',
          role: Role.AGENT,
          isActive: faker.datatype.boolean(),
          photo: faker.image.avatar(),
        },
      }),
    ),
  );

  const agents = await prisma.agent.findMany();
  console.log(`  ✓ ${agents.length} agents`);
  return agents;
}

async function seedLandlords(): Promise<NamedRecord[]> {
  console.log('  → Seeding landlords...');
  const records = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      prisma.landlord.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          countryCode: '+974',
          mobile: faker.phone.number(),
          expiryDate: faker.datatype.boolean() ? faker.date.future() : null,
          alternativeCountryCode: faker.datatype.boolean() ? '+974' : null,
          alternativeMobile: faker.datatype.boolean()
            ? faker.phone.number()
            : null,
          note: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          mapLink: faker.datatype.boolean() ? faker.internet.url() : null,
          marketingAgreement: faker.datatype.boolean() ? 'Yes' : 'No',
          draftContract: faker.datatype.boolean() ? 'Yes' : 'No',
        },
      }),
    ),
  );
  console.log(`  ✓ ${records.length} landlords`);
  return records;
}

async function seedProperties(ctx: {
  categoryRecords: NamedRecord[];
  typeMap: NameMap<NamedRecord>;
  layoutMap: NameMap<NamedRecord>;
  furnishingRecords: NamedRecord[];
  utilityRecords: NamedRecord[];
  facilityRecords: NamedRecord[];
  locationRecords: NamedRecord[];
  agents: NamedRecord[];
  landlordRecords: NamedRecord[];
}): Promise<void> {
  console.log('  → Seeding properties...');

  await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const randomCategory = pickRandom(ctx.categoryRecords);
      const randomTypeName = pickRandom(
        CATEGORY_TYPE_RELATIONS[randomCategory.name],
      );
      const randomType = ctx.typeMap[randomTypeName];
      const validLayoutNames = TYPE_LAYOUT_RELATIONS[randomTypeName] ?? [];
      const randomLayout =
        validLayoutNames.length > 0
          ? ctx.layoutMap[pickRandom(validLayoutNames)]
          : null;

      const selectedUtilities = pickRandomSubset(ctx.utilityRecords, 0, 3);
      const selectedFacilities = pickRandomSubset(ctx.facilityRecords, 0, 5);

      return prisma.property.create({
        data: {
          referenceNumber: `PROP${String(i + 1).padStart(6, '0')}`,
          name: faker.location.streetAddress(),
          shortTerm: faker.datatype.boolean(),
          unitNumber: faker.string.numeric(3),
          bathrooms: faker.number.int({ min: 1, max: 5 }),
          size: faker.number.float({ min: 30, max: 500, fractionDigits: 2 }),
          maidRoom: faker.datatype.boolean(),
          balcony: faker.helpers.arrayElement(['Yes', 'No', 'Large', 'Small']),
          view: pickRandom(Object.values(PropertyView)),
          range: faker.number.float({
            min: 1000,
            max: 10000,
            fractionDigits: 2,
          }),
          commission: faker.number.float({
            min: 150,
            max: 1000,
            fractionDigits: 2,
          }),
          status: pickRandom(Object.values(PropertyStatus)),
          expirationDate: faker.date.future(),
          access: pickRandom(Object.values(PropertyAccess)),
          hasUtilities: selectedUtilities.length > 0,
          hasFacilities: selectedFacilities.length > 0,
          details: faker.lorem.paragraph(),
          directions: faker.lorem.sentence(),
          images: Array.from(
            { length: faker.number.int({ min: 1, max: 4 }) },
            () => faker.image.url(),
          ),
          document: faker.datatype.boolean() ? faker.internet.url() : null,
          category: { connect: { id: randomCategory.id } },
          type: { connect: { id: randomType.id } },
          layout: randomLayout
            ? { connect: { id: randomLayout.id } }
            : undefined,
          location: { connect: { id: pickRandom(ctx.locationRecords).id } },
          furnishing: { connect: { id: pickRandom(ctx.furnishingRecords).id } },
          agent: { connect: { id: pickRandom(ctx.agents).id } },
          landlord: { connect: { id: pickRandom(ctx.landlordRecords).id } },
          utilities: {
            create: selectedUtilities.map((u) => ({ utilityId: u.id })),
          },
          facilities: {
            create: selectedFacilities.map((f) => ({ facilityId: f.id })),
          },
        },
      });
    }),
  );

  console.log('  ✓ 20 properties');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  await purge();

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

  const { records: categoryRecords, map: categoryMap } = await seedMany(
    'categories',
    CATEGORIES,
    (name) => prisma.category.create({ data: { name } }),
  );

  await seedCategoryTypeRelations(categoryMap, typeMap);
  await seedCategoryFurnishingRelations(categoryRecords, furnishingRecords);

  const locationRecords = await seedLocations();
  const agents = await seedAgents();
  const landlordRecords = await seedLandlords();

  await seedProperties({
    categoryRecords,
    typeMap,
    layoutMap,
    furnishingRecords,
    utilityRecords,
    facilityRecords,
    locationRecords,
    agents,
    landlordRecords,
  });

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
