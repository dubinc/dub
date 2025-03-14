import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programInvites = await prisma.programInvite.findMany({
    include: {
      link: true,
    },
    take: 1,
  });

  if (!programInvites.length) {
    console.log("No program invites found");
    return;
  }

  console.log(programInvites);

  for (const programInvite of programInvites) {
    const partner = await prisma.partner.upsert({
      where: {
        email: programInvite.email,
      },
      update: {},
      create: {
        id: createId({ prefix: "pn_" }),
        name: programInvite.email.split("@")[0],
        email: programInvite.email,
      },
    });

    await prisma.programEnrollment.upsert({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: programInvite.programId,
        },
      },
      update: {},
      create: {
        id: createId({ prefix: "pge_" }),
        programId: programInvite.programId,
        partnerId: partner.id,
        status: "invited",
      },
    });

    await prisma.programInvite.delete({
      where: {
        id: programInvite.id,
      },
    });
  }
}

main();
