import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltAffiliate } from "./types";

export async function importAffiliates({
  programId,
  rewardId,
  startingAfter,
}: {
  programId: string;
  rewardId?: string; // not using this for now
  startingAfter?: string;
}) {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await toltImporter.getCredentials(program.workspaceId);

  const toltApi = new ToltApi({ token });

  let hasMoreAffiliates = true;
  let processedBatches = 0;

  // const reward = await prisma.reward.findUniqueOrThrow({
  //   where: {
  //     id: rewardId,
  //   },
  //   select: {
  //     id: true,
  //     event: true,
  //   },
  // });

  while (hasMoreAffiliates && processedBatches < MAX_BATCHES) {
    const { data: affiliates, has_more } = await toltApi.listAffiliates({
      programId,
      startingAfter,
    });

    hasMoreAffiliates = has_more;

    if (affiliates.length === 0) {
      console.log("No more affiliates to import.");
      break;
    }

    const activeAffiliates = affiliates.filter(
      ({ status }) => status === "active",
    );

    if (activeAffiliates.length > 0) {
      await Promise.all(
        activeAffiliates.map((affiliate) =>
          createPartner({
            program,
            affiliate,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    processedBatches++;
  }

  const action = hasMoreAffiliates ? "import-affiliates" : "import-referrals";

  await toltImporter.queue({
    programId: program.id,
    action,
    ...(hasMoreAffiliates && { startingAfter }),
  });
}

// Create partner
async function createPartner({
  program,
  affiliate,
}: {
  program: Program;
  affiliate: ToltAffiliate;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
      email: affiliate.email,
      companyName: affiliate.company_name,
      country: affiliate.country_code,
    },
    update: {},
  });

  await prisma.programEnrollment.upsert({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: program.id,
      },
    },
    create: {
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
    },
    update: {
      status: "approved",
    },
    include: {
      links: true,
    },
  });
}
