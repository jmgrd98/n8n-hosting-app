const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ select: { id: true, email: true, role: true } })
  .then(u => console.log(JSON.stringify(u, null, 2)))
  .finally(() => prisma.$disconnect());
