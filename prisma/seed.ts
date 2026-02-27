import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Initialisation de la base de données...');

    // Purge toutes les données (attention, ça efface tout !)
    await prisma.property.deleteMany({});
    await prisma.agent.deleteMany({});

    // Création d'un admin fixe
    const adminPassword = await bcrypt.hash('Admin@123456', 12);
    await prisma.agent.create({
        data: {
            name: 'Super Admin',
            agentCode: 'AGT_ADMIN', // code unique !
            email: 'admin@stepinproperty.com',
            password: adminPassword,
            mobile: '12345678',
            countryCode: '+974',
            role: Role.ADMIN,
            isActive: true,
            photo: faker.image.avatar(),
        },
    });

    // Génère 10 agents avec codes uniques
    for (let i = 1; i <= 10; i++) {
        await prisma.agent.create({
            data: {
                name: faker.person.fullName(),
                agentCode: `AGT${String(i).padStart(5, '0')}`, // AGT00001 ... AGT00010
                email: faker.internet.email(),
                password: await bcrypt.hash('Agent@123456', 12),
                mobile: faker.phone.number(),
                countryCode: '+974',
                role: Role.AGENT,
                isActive: faker.datatype.boolean(),
                photo: faker.image.avatar(),
            },
        });
    }

    // Récupérer tous les agents pour lier les propriétés à un agent (random)
    const agents = await prisma.agent.findMany();

    // Génère 20 propriétés liées à un agent random
    for (let i = 1; i <= 20; i++) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        await prisma.property.create({
            data: {
                reference_number: `PROP${String(i).padStart(6, '0')}`,
                name: faker.location.streetAddress(),
                shortTerm: faker.datatype.boolean(),
                unit_number: faker.string.numeric(3),
                bathrooms: faker.number.int({ min: 1, max: 5 }),
                size: faker.number.int({ min: 30, max: 500 }),
                maid_room: faker.datatype.boolean(),
                balcony: faker.location.city(),
                view: faker.location.city(),
                range: faker.number.float({ min: 1000, max: 10000 }),
                commission: faker.number.float({ min: 150, max: 1000 }),
                status: faker.helpers.arrayElement(['Active', 'Inactive']),
                expiration_date: faker.date.future(),
                access: faker.location.city(),
                has_utilities: faker.datatype.boolean(),
                has_facilities: faker.datatype.boolean(),
                details: faker.lorem.sentence(),
                directions: faker.location.direction(),
                images: [faker.image.url()],
                created_at: faker.date.recent(),
                updated_at: new Date(),
                agent: {
                    connect: { id: randomAgent.id }, // liaison avec un agent random
                },
            }
        });
    }
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });