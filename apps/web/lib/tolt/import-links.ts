import { prisma } from "@dub/prisma";
import { createLink } from "../api/links";
import { generatePartnerLink } from "../api/partners/create-partner-link";
import { ProgramProps, WorkspaceProps } from "../types";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltLink } from "./types";

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
    include: {
      workspace: true,
    },
  });

  const { workspace } = program;

  const { token, toltProgramId, userId } = await toltImporter.getCredentials(
    workspace.id,
  );

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const links = await toltApi.listLinks({
      programId: toltProgramId,
      startingAfter,
    });

    if (links.length === 0) {
      hasMore = false;
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

    // map partner emails to partner ids
    const partnerMap = new Map(partners.map(({ email, id }) => [email, id]));

    // filter links to only include links with a partner
    const partnerLinks = links.filter((link) =>
      partnerMap.has(link.partner.email),
    );

    if (partnerLinks.length > 0) {
      for (const link of partnerLinks) {
        const partnerId = partnerMap.get(link.partner.email);

        if (!partnerId) {
          console.log("Partner not found", link.partner.email);
          continue;
        }

        await createPartnerLink({
          workspace: workspace as WorkspaceProps,
          program,
          link,
          partnerId,
          userId,
        });
      }
    }

    processedBatches++;
    startingAfter = links[links.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "import-links" : "import-referrals",
    ...(hasMore && { startingAfter }),
  });
}

async function createPartnerLink({
  workspace,
  program,
  link,
  partnerId,
  userId,
}: {
  workspace: WorkspaceProps;
  program: ProgramProps;
  link: ToltLink;
  partnerId: string;
  userId: string;
}) {
  const linkFound = await prisma.link.findFirst({
    where: {
      domain: program.domain!,
      key: link.value,
    },
    select: {
      partnerId: true,
    },
  });

  if (linkFound?.partnerId === partnerId) {
    console.error(
      `Partner ${link.partner.email} already has a link with key ${link.value}`,
    );
    return null;
  }

  try {
    const partnerLink = await generatePartnerLink({
      workspace,
      program,
      partner: link.partner,
      key: link.value,
      partnerId,
      userId,
    });

    return createLink(partnerLink);
  } catch (error) {
    console.error("Error creating partner link", error, link);
    return null;
  }
}
