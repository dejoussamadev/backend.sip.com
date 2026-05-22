import {
    PrismaClient,
    PropertyStatus,
    PropertyAccess,
    PropertyView,
    Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {faker} from '@faker-js/faker';
import {
    prepareSeedAssets,
    seededAssetPath,
    type SeedAssets,
} from './seed-assets';
import {QATAR_LOCATIONS} from './seed-locations';
import {
    CATEGORIES,
    CATEGORY_TYPE_RELATIONS,
    FACILITIES,
    FURNISHINGS,
    LAYOUTS,
    PROPERTY_SEED_COUNT,
    TYPE_LAYOUT_RELATIONS,
    TYPES,
    UTILITIES,
} from './seed-data';

const prisma = new PrismaClient();

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

function seededUploadPath(...segments: string[]): string {
    return seededAssetPath(...segments);
}

function imageFromPool(
    pool: string[],
    index: number,
    fallback: string,
): string {
    return pool[index % pool.length] ?? fallback;
}

async function seedMany<T extends NamedRecord>(
    label: string,
    names: string[],
    creator: (name: string) => Promise<T>,
): Promise<{ records: T[]; map: NameMap<T> }> {
    console.log(`  → Seeding ${label}...`);
    const records = await Promise.all(names.map(creator));
    console.log(`  ✓ ${records.length} ${label}`);
    return {records, map: toNameMap(records)};
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
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
    await Promise.all(pairs.map((data) => prisma.typeLayout.create({data})));
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
    await Promise.all(pairs.map((data) => prisma.categoryType.create({data})));
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
        pairs.map((data) => prisma.categoryFurnishing.create({data})),
    );
    console.log(`  ✓ ${pairs.length} category-furnishing relations`);
}

async function seedLocations(): Promise<NamedRecord[]> {
    console.log('  → Seeding locations...');

    const records = await Promise.all(
        QATAR_LOCATIONS.map((name) => prisma.location.create({data: {name}})),
    );

    console.log(`  ✓ ${records.length} locations`);
    return records;
}

async function seedUsers(imageAssets: SeedAssets): Promise<NamedRecord[]> {
    console.log('  → Seeding users...');

    const adminPassword = await bcrypt.hash('Admin1234!', 12);
    const agentPassword = await bcrypt.hash('Agent1234!', 12);

    await Promise.all(
        Array.from({length: 5}, async (_, index) =>
            prisma.user.create({
                data: {
                    name: faker.person.fullName(),
                    agentCode: `ADM${String(index + 1).padStart(5, '0')}`,
                    email: `admin${index + 1}@stepinproperty.com`,
                    password: adminPassword,
                    mobile: faker.string.numeric(8),
                    countryCode: '+974',
                    designation: faker.helpers.arrayElement([
                        'System Administrator',
                        'Operations Manager',
                        'Branch Manager',
                        'Sales Director',
                        'General Manager',
                    ]),
                    role: Role.ADMIN,
                    isActive: true,
                    photo: imageFromPool(
                        imageAssets.agentPhotos,
                        index,
                        seededUploadPath('images', `admin-${index + 1}.jpg`),
                    ),
                },
            }),
        ),
    );

    await Promise.all(
        Array.from({length: 30}, async (_, index) =>
            prisma.user.create({
                data: {
                    name: faker.person.fullName(),
                    agentCode: `AGT${String(index + 1).padStart(5, '0')}`,
                    email: `agent${index + 1}@stepinproperty.com`,
                    password: agentPassword,
                    mobile: faker.string.numeric(8),
                    countryCode: '+974',
                    designation: faker.helpers.arrayElement([
                        'Property Consultant',
                        'Senior Property Consultant',
                        'Leasing Agent',
                        'Sales Agent',
                        'Real Estate Advisor',
                    ]),
                    role: Role.AGENT,
                    isActive: true,
                    photo: imageFromPool(
                        imageAssets.agentPhotos,
                        index + 5,
                        seededUploadPath('images', `agent-${index + 1}.jpg`),
                    ),
                },
            }),
        ),
    );

    const users = await prisma.user.findMany();
    console.log(`  ✓ ${users.length} users`);
    return users;
}

async function seedLandlords(imageAssets: SeedAssets): Promise<NamedRecord[]> {
    console.log('  → Seeding landlords...');

    const records = await Promise.all(
        Array.from({length: 10}).map((_, index) => {
            // Date d'expiration toujours présente
            const expiryDate = faker.date.future();

            return prisma.landlord.create({
                data: {
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    countryCode: '+974',
                    mobile: faker.phone.number(),
                    expiryDate: expiryDate, // TOUJOURS une date, jamais null
                    photo: faker.datatype.boolean(0.8)
                        ? imageFromPool(
                            imageAssets.landlordPhotos,
                            index,
                            seededUploadPath('landlords', `photo-${index + 1}.jpg`),
                        )
                        : null,

                    alternativeCountryCode: faker.datatype.boolean(0.3) ? '+974' : null,
                    alternativeMobile: faker.datatype.boolean(0.3)
                        ? faker.phone.number()
                        : null,
                    note: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,

                    mapLink: faker.datatype.boolean(0.7)
                        ? faker.internet.url()
                        : 'https://maps.google.com/?q=Qatar', // Valeur par défaut

                    // Toujours des chemins de fichiers valides
                    marketingAgreement:
                        imageAssets.landlordAgreements[
                        index % imageAssets.landlordAgreements.length
                            ] ?? seededUploadPath('landlords', `agreement-${index + 1}.pdf`),
                    draftContract:
                        imageAssets.landlordContracts[
                        index % imageAssets.landlordContracts.length
                            ] ?? seededUploadPath('landlords', `contract-${index + 1}.pdf`),
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
    users: NamedRecord[];
    landlordRecords: NamedRecord[];
    imageAssets: SeedAssets;
}): Promise<void> {
    console.log('  → Seeding properties...');

    await Promise.all(
        Array.from({length: PROPERTY_SEED_COUNT}, (_, i) => {
            const randomCategory = pickRandom(ctx.categoryRecords);
            const randomTypeName = pickRandom(
                CATEGORY_TYPE_RELATIONS[randomCategory.name],
            );
            const randomType = ctx.typeMap[randomTypeName];
            const validLayoutNames = TYPE_LAYOUT_RELATIONS[randomTypeName] ?? [
                'Mixed',
            ];
            const layoutName = pickRandom(validLayoutNames);
            const randomLayout = ctx.layoutMap[layoutName] ?? ctx.layoutMap['Mixed'];

            const selectedUtilities = pickRandomSubset(ctx.utilityRecords, 0, 3);
            const selectedFacilities = pickRandomSubset(ctx.facilityRecords, 0, 5);

            return prisma.property.create({
                data: {
                    referenceNumber: `PROP${String(i + 1).padStart(6, '0')}`,
                    name: faker.location.streetAddress(),
                    shortTerm: faker.datatype.boolean(),
                    multipleUnits: i % 5 === 0,
                    unitNumber: i % 5 === 0 ? null : faker.string.numeric(3),
                    bathrooms: faker.number.int({min: 1, max: 5}),
                    size: faker.number.float({min: 30, max: 500, fractionDigits: 2}),
                    maidRoom: faker.datatype.boolean(),
                    balcony: faker.helpers.arrayElement(['Yes', 'No', 'Large', 'Small']),
                    view: pickRandom(Object.values(PropertyView)),
                    range: faker.number.float({
                        min: 1000,
                        max: 10000,
                        fractionDigits: 2,
                    }),
                    commission: faker.number.float({
                        min: 0,
                        max: 50,
                        fractionDigits: 2,
                    }),
                    downPaymentAmount: faker.datatype.boolean(0.6)
                        ? faker.number.float({min: 500, max: 5000, fractionDigits: 2})
                        : null,
                    status: pickRandom(Object.values(PropertyStatus)),
                    expirationDate: faker.date.future(),
                    access: pickRandom(Object.values(PropertyAccess)),
                    hasUtilities: selectedUtilities.length > 0,
                    hasFacilities: selectedFacilities.length > 0,
                    details: faker.lorem.paragraph(),
                    directions: faker.lorem.sentence(),
                    images:
                        ctx.imageAssets.propertyImages.length > 0
                            ? faker.helpers.arrayElements(
                                ctx.imageAssets.propertyImages,
                                faker.number.int({
                                    min: Math.min(4, ctx.imageAssets.propertyImages.length),
                                    max: ctx.imageAssets.propertyImages.length,
                                }),
                            )
                            : Array.from(
                                {length: faker.number.int({min: 4, max: 6})},
                                (_, imageIndex) =>
                                    seededUploadPath(
                                        'images',
                                        `property-${i + 1}-image-${imageIndex + 1}.jpg`,
                                    ),
                            ),
                    document: faker.datatype.boolean()
                        ? (ctx.imageAssets.propertyDocuments[
                        i % ctx.imageAssets.propertyDocuments.length
                            ] ?? seededUploadPath('documents', `property-${i + 1}.pdf`))
                        : null,
                    category: {connect: {id: randomCategory.id}},
                    type: {connect: {id: randomType.id}},
                    layout: {connect: {id: randomLayout.id}},
                    location: {connect: {id: pickRandom(ctx.locationRecords).id}},
                    furnishing: {connect: {id: pickRandom(ctx.furnishingRecords).id}},
                    user: {connect: {id: pickRandom(ctx.users).id}},
                    landlord: {connect: {id: pickRandom(ctx.landlordRecords).id}},
                    utilities: {
                        create: selectedUtilities.map((u) => ({utilityId: u.id})),
                    },
                    facilities: {
                        create: selectedFacilities.map((f) => ({facilityId: f.id})),
                    },
                },
            });
        }),
    );

    console.log(`  ✓ ${PROPERTY_SEED_COUNT} properties`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log('🌱 Seeding database...\n');

    await purge();
    const imageAssets = await prepareSeedAssets();

    const {records: utilityRecords} = await seedMany(
        'utilities',
        UTILITIES,
        (name) => prisma.utility.create({data: {name}}),
    );
    const {records: facilityRecords} = await seedMany(
        'facilities',
        FACILITIES,
        (name) => prisma.facility.create({data: {name}}),
    );
    const {records: furnishingRecords} = await seedMany(
        'furnishings',
        FURNISHINGS,
        (name) => prisma.furnishing.create({data: {name}}),
    );
    const {map: layoutMap} = await seedMany('layouts', LAYOUTS, (name) =>
        prisma.layout.create({data: {name}}),
    );
    const {map: typeMap} = await seedMany('types', TYPES, (name) =>
        prisma.type.create({data: {name}}),
    );

    await seedTypeLayoutRelations(typeMap, layoutMap);

    const {records: categoryRecords, map: categoryMap} = await seedMany(
        'categories',
        CATEGORIES,
        (name) => prisma.category.create({data: {name}}),
    );

    await seedCategoryTypeRelations(categoryMap, typeMap);
    await seedCategoryFurnishingRelations(categoryRecords, furnishingRecords);

    const locationRecords = await seedLocations();
    const users = await seedUsers(imageAssets);
    const landlordRecords = await seedLandlords(imageAssets);

    await seedProperties({
        categoryRecords,
        typeMap,
        layoutMap,
        furnishingRecords,
        utilityRecords,
        facilityRecords,
        locationRecords,
        users,
        landlordRecords,
        imageAssets,
    });

    console.log('\n✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
