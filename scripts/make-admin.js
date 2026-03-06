const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const email = process.argv[2];
if (!email) { console.error('Usage: node make-admin.js <email>'); process.exit(1); }
prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
  .then(u => console.log(`✅ ${u.email} is now ${u.role}`))
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
