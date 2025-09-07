import { prisma } from "@dub/prisma";
import { createLink } from "../api/links";
import { generatePartnerLink } from "../api/partners/generate-partner-link";
import { PartnerProps, ProgramProps, WorkspaceProps } from "../types";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltImportPayload, ToltLink } from "./types";

export async function importLinks(payload: ToltImportPayload) {
  let { programId, toltProgramId, userId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { workspace } = program;

  const { token } = await toltImporter.getCredentials(workspace.id);

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
        name: true,
      },
    });

    // create a map of partner emails to partner props
    const partnerMap = new Map(
      partners.map(({ email, id, name }) => [email, { id, name, email }]),
    );

    // filter links to only include links with a partner
    const partnerLinks = links.filter((link) =>
      partnerMap.has(link.partner.email),
    );

    if (partnerLinks.length > 0) {
      for (const link of partnerLinks) {
        const partner = partnerMap.get(link.partner.email);

        if (!partner) {
          console.log("Partner not found", link.partner.email);
          continue;
        }

        await createPartnerLink({
          workspace: workspace as WorkspaceProps,
          program,
          link,
          partner,
          userId,
        });
      }
    }

    processedBatches++;
    startingAfter = links[links.length - 1].id;
  }

  await toltImporter.queue({
    ...payload,
    startingAfter: hasMore ? startingAfter : undefined,
    action: hasMore ? "import-links" : "import-customers",
  });
}

async function createPartnerLink({
  workspace,
  program,
  partner,
  link,
  userId,
}: {
  workspace: WorkspaceProps;
  program: ProgramProps;
  link: ToltLink;
  partner: Pick<PartnerProps, "id" | "name" | "email">;
  userId: string;
}) {
  const linkFound = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: program.domain!,
        key: link.value,
      },
    },
    select: {
      partnerId: true,
    },
  });

  if (linkFound?.partnerId === partner.id) {
    console.log(
      `Partner ${link.partner.email} already has a link with key ${link.value}, skipping...`,
    );
    return null;
  }

  try {
    const partnerLink = await generatePartnerLink({
      workspace,
      program,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email!,
      },
      link: {
        domain: program.domain!,
        url: program.url!,
        key: link.value,
      },
      userId,
    });

    return createLink({
      ...partnerLink,
      skipCouponCreation: true,
    });
  } catch (error) {
    console.error("Error creating partner link", error, link);
    return null;
  }
}
