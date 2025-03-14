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
        name: programInvite.email.split("@")[0],
        email: programInvite.email,
      },
    });

    await prisma.programEnrollment.create({
      data: {
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
