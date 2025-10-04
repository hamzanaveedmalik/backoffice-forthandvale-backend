import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.leadEvent.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.org.deleteMany();

  // Create organization
  const org = await prisma.org.create({
    data: {
      name: 'Forth & Vale Leather',
      slug: 'default',
    },
  });
  console.log(`✅ Created organization: ${org.name}`);

  // Create users
  const superUser = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'admin@forthvale.com',
      fullName: 'System Administrator',
      role: Role.SUPER,
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'manager@forthvale.com',
      fullName: 'Operations Manager',
      role: Role.USER,
      passwordHash: await bcrypt.hash('manager123', 10),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      orgId: org.id,
      email: 'viewer@forthvale.com',
      fullName: 'Dashboard Viewer',
      role: Role.MINI,
      passwordHash: await bcrypt.hash('viewer123', 10),
    },
  });

  console.log(`✅ Created users: ${superUser.fullName}, ${managerUser.fullName}, ${viewerUser.fullName}`);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
