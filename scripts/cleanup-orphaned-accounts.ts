// scripts/cleanup-orphaned-accounts.ts
// Run with: npx tsx scripts/cleanup-orphaned-accounts.ts

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany();
  console.log(`Found ${accounts.length} account(s) total.`);

  let deleted = 0;
  for (const account of accounts) {
    const user = await prisma.user.findUnique({
      where: { id: account.userId },
    });

    if (!user) {
      console.log(
        `Deleting orphaned account: provider=${account.provider}, userId=${account.userId}`
      );
      await prisma.account.delete({ where: { id: account.id } });
      deleted++;
    }
  }

  console.log(`Done. Deleted ${deleted} orphaned account(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
