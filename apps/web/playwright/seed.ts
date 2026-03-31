import "dotenv-flow/config";

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const E2E_PARTNER = {
  name: "Partner 1",
  email: "partner1@dub-internal-test.com",
  password: "password",
};

async function main() {
  const passwordHash = hashSync(E2E_PARTNER.password, 10);

  const user = await prisma.user.upsert({
    where: {
      email: E2E_PARTNER.email,
    },
    update: {},
    create: {
      email: E2E_PARTNER.email,
      name: E2E_PARTNER.name,
      emailVerified: new Date(),
      passwordHash,
    },
  });

  const partner = await prisma.partner.upsert({
    where: {
      email: E2E_PARTNER.email,
    },
    update: {},
    create: {
      name: E2E_PARTNER.name,
      email: E2E_PARTNER.email,
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
