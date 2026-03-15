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
  'Compound Villa': ['2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR', '9BR', '10BR+'],
  Land: ['SQM SPACE'],
  'Labor Camp': ['SQM SPACE', 'Mixed'],
  'Office Space': ['SQM SPACE', 'Mixed'],
  'Retail Space': ['SQM SPACE', 'Mixed'],
  Warehouse: ['SQM SPACE', 'Mixed'],
  'Whole Building': ['Mixed', 'SQM SPACE'],
  'Whole Compound': ['2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR', '9BR', '10BR+', 'Mixed'],
  Penthouse: ['1BR', '2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR', '9BR', '10BR+'],
  'Standalone Villa': ['1BR', '2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR', '9BR', '10BR+'],
  Townhouse: ['1BR', '2BR', '3BR', '4BR', 'Mixed', 'Studio'],
  Villa: ['2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR', '9BR', '10BR+'],
  'Villa Partition': ['1BR', '2BR', '3BR', 'Studio'],
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

  const QATAR_LOCATIONS = [
    'Aamra - Al Wakra', 'Abal Halayem - Al Rayyan', 'Abal Jahazel - Al Sheehaniya',
    'Abu Dhalouf - Al Shamal', 'Abu Hamour - Al Rayyan', 'Abu Samra - Al Rayyan',
    'Abu Sidra - Al Rayyan', 'Afjan - Al Sheehaniya', 'Ain Khaled - Al Rayyan',
    'Ain Sinan - Al Shamal', 'Al Afja - Al Wakra', 'Al Areesh - Al Shamal',
    'Al Aziziya - Al Rayyan', 'Al Bidda - Doha', 'Al Dafna - Doha',
    'Al Daiha - Al Wakra', 'Al Dakheera - Al Khor', 'Al Deainiyat - Al Rayyan',
    'Al Ebb - Al Daayen', 'Al Edaid Base - Al Rayyan', 'Al Egla - Al Daayen',
    'Al Froosh - Umm Salal', 'Al Gaeyya - Al Sheehaniya', 'Al Galayel - Al Rayyan',
    'Al Garayen - Al Rayyan', 'Al Gassar - Doha', 'Al Ghariya - Al Shamal',
    'Al Ghanim Al Jadeed - Al Rayyan', 'Al Hamla - Al Sheehaniya', 'Al Hawafer - Al Sheehaniya',
    'Al Hemaila - Al Rayyan', 'Al Hilal - Doha', 'Al Hitmi - Doha',
    'Al Jasra - Doha', 'Al Jelaiat - Al Rayyan', 'Al Jemailiya - Al Sheehaniya',
    'Al Jeryan - Al Daayen', 'Al Karaana - Al Rayyan', 'Al Khaldiya - Al Rayyan',
    'Al Kharaitiyat - Umm Salal', 'Al Kharayej - Lusail', 'Al Kharrara - Al Wakra',
    'Al Kheesa - Al Daayen', 'Al Khor City - Al Khor', 'Al Khulaifat - Doha',
    'Al Luqta - Al Daayen', 'Al Luqta - Al Rayyan', 'Al Maamoura - Doha',
    'Al Manaseer - Al Rayyan', 'Al Mansoura - Doha', 'Al Markhiya - Doha',
    'Al Marroona - Al Shamal', 'Al Masrouhiya - Al Daayen', 'Al Mashaf - Al Wakra',
    'Al Mearad - Al Rayyan', 'Al Messila - Doha', 'Al Metfardat - Al Wakra',
    'Al Mirqab - Doha', 'Al Mirqab Al Jadeed - Doha', 'Al Muntazah - Doha',
    'Al Murra - Al Rayyan', 'Al Najada - Doha', 'Al Nasr - Doha',
    'Al Nasraniya - Al Rayyan', 'Al Nehaidan - Al Wakra', 'Al Nigyan - Al Wakra',
    'Al Rehayya - Al Daayen', 'Al Rekayya - Al Rayyan', 'Al Ruffaa - Doha',
    'Al Rumaila - Doha', 'Al Ruwaidat - Al Sheehaniya', 'Al Sadd - Doha',
    'Al Sailiya - Al Rayyan', 'Al Sakhama - Al Daayen', 'Al Seej - Al Rayyan',
    'Al Shabhana - Al Sheehaniya', 'Al Shaqab - Al Rayyan', 'Al Sheehaniya - Al Sheehaniya',
    'Al Sidari - Al Wakra', 'Al Slemiya - Al Rayyan', 'Al Souq (Souq Waqif) - Doha',
    'Al Tarfa - Doha', 'Al Themaid - Al Rayyan', 'Al Thumama - Doha',
    'Al Waab - Al Rayyan', 'Al Wajba - Al Rayyan', 'Al Wakra - Al Wakra',
    'Al Wukair - Al Wakra', 'Al Zeghain - Al Sheehaniya', 'Al Zubara - Al Shamal',
    'Aspire Zone - Al Rayyan', 'Atran - Al Sheehaniya', 'Baaya - Al Rayyan',
    'Bani Hajer - Al Rayyan', 'Barahat Al Jufairi - Doha', 'Barga Al Hamil - Al Rayyan',
    'Barga Al Kharaz - Al Rayyan', 'Barga Egaif - Al Sheehaniya', 'Barwa City - Al Rayyan',
    'Birkat Al Awamer - Al Wakra', 'Broog - Al Sheehaniya', 'Bu Fessela - Umm Salal',
    'Bu Garn - Al Sheehaniya', 'Bu Garn - Umm Salal', 'Bu Ghawlana - Al Sheehaniya',
    'Bu Glaila - Umm Salal', 'Bu Kheesa - Al Sheehaniya', 'Bu Traifa - Al Sheehaniya',
    'Dahl Al Hamam - Doha', 'Doha Al Jadeeda - Doha', 'Doha Port - Doha',
    'Duhail - Doha', 'Dukhan - Al Sheehaniya', 'Education City - Al Rayyan',
    'Eglat Faisal - Al Rayyan', 'Eglat Zuwayyed - Al Wakra', 'Erkyah - Lusail',
    'Fereej Abdel Aziz - Doha', 'Fereej Al Ali - Doha', 'Fereej Al Amir - Al Rayyan',
    'Fereej Al Asiri - Al Rayyan', 'Fereej Al Asmakh - Doha', 'Fereej Al Manaseer - Al Rayyan',
    'Fereej Al Murra - Al Rayyan', 'Fereej Al Soudan - Al Rayyan', 'Fereej Al Zaeem - Al Rayyan',
    'Fereej Bin Dirhem - Doha', 'Fereej Bin Mahmoud - Doha', 'Fereej Bin Omran - Doha',
    'Fereej Kulaib - Doha', 'Floresta Gardens - The Pearl', 'Fox Hills - Lusail',
    'Fuwairit - Al Shamal', 'Getna - Al Sheehaniya', 'Gewan Island - The Pearl',
    'Gharaffat Al Rayyan - Al Rayyan', 'Gharaf Al Thawr - Al Rayyan', 'Ghasham - Al Wakra',
    'Giardino - The Pearl', 'Hamad International Airport - Doha', 'Hamad Medical City - Doha',
    'Hazm Al Markhiya - Doha', 'Huzoom - Lusail', 'Imlaih - Al Rayyan',
    'Industrial Area - Al Khor', 'Industrial Area - Doha', 'Izghawa - Doha',
    'Jabal Marmi - Al Wakra', 'Jabal Thuaileb - Al Daayen', 'Jaww Al Kharaz - Al Rayyan',
    'Jelaiah - Al Rayyan', 'Jeryan Al Reyoog - Al Rayyan', 'Jeryan Jenaihat - Al Daayen',
    'Jeryan Nejaima - Doha', 'Jery Al Dabi - Al Rayyan', 'Jery Al Matrooshi - Al Daayen',
    'Jery Khabbab - Umm Salal', 'Katara Cultural Village - Doha', 'Khor Al Udaid - Al Wakra',
    'La Plage - The Pearl', 'Leabaib - Al Daayen', 'Learagg - Al Rayyan',
    'Leashara - Al Rayyan', 'Leatooriya - Al Sheehaniya', 'Lebday - Al Rayyan',
    'Lebsayyer - Al Sheehaniya', 'Lebyatiya - Al Sheehaniya', 'Legsaira - Al Wakra',
    'Legtaifiya - Doha', 'Lekhoos - Al Wakra', 'Lekhwair - Doha',
    'Leshaiger - Al Wakra', 'Lewaija - Al Khor', 'Leghraifa - Al Khor',
    'Luaib - Al Rayyan', 'Lusail District', 'Lusail Marina - Lusail',
    'Lusail Waterfront - Lusail', 'Madina Centrale - The Pearl', 'Madinat Al Kaaban - Al Shamal',
    'Madinat Al Shamal - Al Shamal', 'Madinat Khalifa North - Doha', 'Madinat Khalifa South - Doha',
    'Mebaireek - Al Rayyan', 'Mehairja - Al Rayyan', 'Mekaines - Al Rayyan',
    'Mesaieed - Al Wakra', 'Mesaieed Free Zone - Al Wakra', 'Mesaieed Industrial Area - Al Wakra',
    'Mesaigra - Al Wakra', 'Mesaimeer - Al Rayyan', 'Msheireb - Doha',
    'Muaither - Al Rayyan', 'Muaither Al Wukair - Al Wakra', 'Muraikh - Al Rayyan',
    'Najma - Doha', 'Nega Al Fagara - Al Wakra', 'Negyan Al Sada - Al Wakra',
    'New Al Hitmi - Doha', 'New Al Rayyan - Al Rayyan', 'New Fereej Al Khulaifat - Al Rayyan',
    'New Industrial Area - Al Rayyan', 'New Salata - Doha', 'Nuaija - Doha',
    'Old Airport - Doha', 'Old Al Ghanim - Doha', 'Old Al Rayyan - Doha',
    'Old Salata - Doha', 'Onaiza - Doha', 'Porto Arabia - The Pearl',
    'Qanat Quartier - The Pearl', 'Qetaifan Island - Lusail', 'QNCC - Al Rayyan',
    'Ras Bu Abboud - Doha', 'Ras Bu Fontas - Al Wakra', 'Ras Laffan - Al Khor',
    'Rasheeda - Al Khor', 'Rawdat Abal Heeran - Al Rayyan', 'Rawdat Al Faras - Al Khor',
    'Rawdat Al Faras - Al Rayyan', 'Rawdat Al Hamama - Al Daayen', 'Rawdat Al Jahhaniya - Al Rayyan',
    'Rawdat Al Khail - Doha', 'Rawdat Egdaim - Al Rayyan', 'Rawdat Hawtan - Al Khor',
    'Rawdat Ishala - Al Rayyan', 'Rawdat Kharja - Al Sheehaniya', 'Ruwais - Al Shamal',
    'Sabina - Al Rayyan', 'Sawda Natheel - Al Rayyan', 'Sealine - Al Wakra',
    'Semaisma - Al Daayen', 'Shagra - Al Wakra', 'Shariya - Al Rayyan',
    'Snay Lehmaidi - Umm Salal', 'Tenbek - Al Daayen', 'The Pearl - Doha',
    'The Pearl Island', 'The Seef - Lusail', 'Tharb - Al Rayyan',
    'Traina - Al Wakra', 'Umm Ain - Al Rayyan', 'Umm Al Amad - Umm Salal',
    'Umm Al Dayyat - Al Sheehaniya', 'Umm Al March - Al Rayyan', 'Umm Al Seneem - Al Rayyan',
    'Umm Bab - Al Sheehaniya', 'Umm Besher - Al Wakra', 'Umm Birkah - Al Khor',
    'Umm Ebairiya - Umm Salal', 'Umm Ejwaifa - Al Khor', 'Umm Garn - Al Daayen',
    'Umm Ghuwailina - Doha', 'Umm Jarra - Al Rayyan', 'Umm Juwashen - Al Rayyan',
    'Umm Leghab - Al Sheehaniya', 'Umm Lekhba - Doha', 'Umm Lekhya - Al Sheehaniya',
    'Umm Salal Ali - Umm Salal', 'Umm Salal Mohammed - Umm Salal', 'Umm Samra - Al Sheehaniya',
    'Umm Saneem - Doha', 'Umm Shubrum - Al Rayyan', 'Umm Sidra - Al Sheehaniya',
    'Umm Wadi - Al Sheehaniya', 'Umm Zubar West - Al Sheehaniya', 'Viva Bahriya - The Pearl',
    'Wadi Aba Seleel - Al Wakra', 'Wadi Abal Gherban - Al Wakra', 'Wadi Al Banat - Al Daayen',
    'Wadi Al Ewaira - Al Daayen', 'Wadi Al Jinh - Al Rayyan', 'Wadi Al Sail - Doha',
    'Wadi Al Wasah - Al Daayen', 'Wadi Jallal - Al Wakra', 'Wadi Laswag - Al Sheehaniya',
    'West Bay - Doha', 'West Bay Lagoon - Doha', 'Wholesale Market - Doha',
  ];

  const records = await Promise.all(
    QATAR_LOCATIONS.map((name) =>
      prisma.location.create({ data: { name } }),
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
      Array.from({ length: 10 }).map((_, index) => {
        // Date d'expiration toujours présente
        const expiryDate = faker.date.future();

        return prisma.landlord.create({
          data: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            countryCode: '+974',
            mobile: faker.phone.number(),
            expiryDate: expiryDate, // TOUJOURS une date, jamais null

            alternativeCountryCode: faker.datatype.boolean(0.3) ? '+974' : null,
            alternativeMobile: faker.datatype.boolean(0.3) ? faker.phone.number() : null,
            note: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,

            mapLink: faker.datatype.boolean(0.7)
                ? faker.internet.url()
                : 'https://maps.google.com/?q=Qatar', // Valeur par défaut

            // Toujours des chemins de fichiers valides
            marketingAgreement: `/uploads/landlords/agreement-${index + 1}.pdf`,
            draftContract: `/uploads/landlords/contract-${index + 1}.pdf`,
          },
        });
      }),
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
      const validLayoutNames = TYPE_LAYOUT_RELATIONS[randomTypeName] ?? ['Mixed'];
      const layoutName = pickRandom(validLayoutNames);
      const randomLayout = ctx.layoutMap[layoutName] ?? ctx.layoutMap['Mixed'];

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
          layout: { connect: { id: randomLayout.id } },
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
