import "dotenv-flow/config";

import { hashPassword } from "@/lib/auth/password";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const E2E_PARTNER = {
  name: "Partner 1",
  email: "partner1@dub-internal-test.com",
  password: "password",
};

async function main() {
  const passwordHash = await hashPassword(E2E_PARTNER.password);

  const user = await prisma.user.upsert({
    where: {
      email: E2E_PARTNER.email,
    },
    update: {
      passwordHash,
      emailVerified: new Date(),
      emailVerifiedBa: true,
    },
    create: {
      email: E2E_PARTNER.email,
      name: E2E_PARTNER.name,
      emailVerified: new Date(),
      emailVerifiedBa: true,
      passwordHash,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    update: {
      password: passwordHash,
    },
    create: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
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
