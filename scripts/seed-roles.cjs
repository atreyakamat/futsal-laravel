const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Password@123', 10);

  // create user for super admin
  const user1 = await prisma.user.upsert({
    where: { email: 'super@test.com' },
    update: { password: hash },
    create: {
      email: 'super@test.com',
      password: hash,
      name: 'Super Admin User',
      role: 'super_admin'
    }
  });

  await prisma.superAdmin.upsert({
    where: { email: 'super@test.com' },
    update: { passwordHash: hash },
    create: {
      email: 'super@test.com',
      passwordHash: hash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      permissions: ['*'],
      userId: user1.id
    }
  });

  const arena = await prisma.arena.findFirst();
  
  if (arena) {
    await prisma.arenaAdmin.upsert({
      where: { email: 'arena@test.com' },
      update: { passwordHash: hash, arenaId: arena.id },
      create: {
        email: 'arena@test.com',
        passwordHash: hash,
        firstName: 'Arena',
        lastName: 'Admin',
        arenaId: arena.id,
        isActive: true,
        createdBy: user1.id
      }
    });

    await prisma.securityStaff.upsert({
      where: { email: 'security@test.com' },
      update: { passwordHash: hash, arenaId: arena.id },
      create: {
        email: 'security@test.com',
        passwordHash: hash,
        firstName: 'Security',
        lastName: 'Guard',
        arenaId: arena.id,
        isActive: true,
        createdBy: user1.id
      }
    });
    console.log('Successfully created test users!');
  } else {
    console.log('No arena found to link to!');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
