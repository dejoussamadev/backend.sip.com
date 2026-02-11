import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Initialisation de la base de données...');

    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.agent.findFirst({
        where: { role: Role.ADMIN },
    });

    if (existingAdmin) {
        console.log('✅ Un admin existe déjà:', existingAdmin.email);
        return;
    }

    const adminPassword = await bcrypt.hash('Admin@123456', 12);

    const admin = await prisma.agent.create({
        data: {
            name: 'Super Admin',
            agentCode: 'AGT00001',
            email: 'admin@stepinproperty.com',
            password: adminPassword,
            mobile: '12345678',
            countryCode: '+974',
            role: Role.ADMIN,
            isActive: true,
        },
    });

    console.log('');
    console.log('✅ Admin créé avec succès!');
    console.log('════════════════════════════════════════');
    console.log('📧 Email:        admin@stepinproperty.com');
    console.log('🔑 Mot de passe: Admin@123456');
    console.log('👤 Rôle:         ADMIN');
    console.log('🆔 Agent Code:   AGT00001');
    console.log('════════════════════════════════════════');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });