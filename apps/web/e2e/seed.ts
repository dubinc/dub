import "dotenv-flow/config";

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = hashSync("test-password-123", 10);

  const user = await prisma.user.upsert({
    where: {
      email: "e2e-partner@test.local",
    },
    update: {},
    create: {
      email: "e2e-partner@test.local",
      name: "E2E Test Partner",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  const partner = await prisma.partner.upsert({
    where: {
      email: "e2e-partner@test.local",
    },
    update: {},
    create: {
      name: "E2E Test Partner",
      email: "e2e-partner@test.local",
      country: "US",
      users: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      defaultPartnerId: partner.id,
    },
  });

  console.log("Seeded test partner:", {
    userId: user.id,
    partnerId: partner.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
