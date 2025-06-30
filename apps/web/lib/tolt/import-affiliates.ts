import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
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

  const { userId, token } = await toltImporter.getCredentials(
    program.workspaceId,
  );

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
          createPartnerAndLinks({
            program,
            affiliate,
            userId,
            toltApi,
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

// Create partner and their links
async function createPartnerAndLinks({
  program,
  affiliate,
  userId,
  toltApi,
}: {
  program: Program;
  affiliate: ToltAffiliate;
  userId: string;
  toltApi: ToltApi;
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

  const programEnrollment = await prisma.programEnrollment.upsert({
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

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  if (programEnrollment.links.length > 0) {
    console.log("Partner already has links", partner.id);
    return;
  }

  const { data: links } = await toltApi.listLinks({
    programId: program.id,
    partnerId: partner.id,
  });

  if (links.length === 0) {
    console.log("No links found for partner", partner.id);
    return;
  }

  await bulkCreateLinks({
    links: links.map((link) => ({
      domain: program.domain!,
      key: link.value || nanoid(),
      url: program.url!,
      trackConversion: true,
      programId: program.id,
      partnerId: partner.id,
      folderId: program.defaultFolderId,
      projectId: program.workspaceId,
      userId,
    })),
  });
}
