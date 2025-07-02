import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { bulkCreateLinks } from "../api/links";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";

export async function importLinks({
  programId,
  startingAfter,
}: {
  programId: string;
  startingAfter?: string;
}) {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token, toltProgramId, userId } = await toltImporter.getCredentials(
    program.workspaceId,
  );

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const { data: links, has_more } = await toltApi.listLinks({
      programId: toltProgramId,
      startingAfter,
    });

    hasMore = has_more;

    if (links.length === 0) {
      console.log("No more links to import.");
      break;
    }

    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: links.map(({ partner }) => partner.email),
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const partnerMap = new Map(partners.map(({ email, id }) => [email, id]));

    const activeLinks = links.filter((link) =>
      partnerMap.has(link.partner.email),
    );

    if (activeLinks.length === 0) {
      console.log("No active links to import.");
      break;
    }

    await bulkCreateLinks({
      links: activeLinks.map((link) => ({
        userId,
        programId,
        projectId: program.workspaceId,
        partnerId: partnerMap.get(link.partner.email),
        folderId: program.defaultFolderId,
        domain: program.domain!,
        key: link.value || nanoid(),
        url: program.url!,
        trackConversion: true,
      })),
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    processedBatches++;
    startingAfter = links[links.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "import-links" : "import-referrals",
    ...(hasMore && { startingAfter }),
  });
}
