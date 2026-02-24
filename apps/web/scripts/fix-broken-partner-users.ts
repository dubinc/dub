import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      defaultPartnerId: null,
      partners: {
        some: {},
      },
    },
    include: {
      partners: {
        select: {
          partner: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${users.length} users with no default partner id`);
  console.table(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      partnerId: user.partners[0]?.partner.id,
      partnerEmail: user.partners[0]?.partner.email,
      matchingPartnerEmail:
        user.partners[0]?.partner.email === user.email ? "Yes" : "No",
    })),
  );

  const chunks = chunk(users, 20);
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { defaultPartnerId: user.partners[0]?.partner.id },
        }),
      ),
    );
  }
}

main();
