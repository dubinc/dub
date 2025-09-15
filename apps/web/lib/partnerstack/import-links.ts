import { prisma } from "@dub/prisma";
import { createLink } from "../api/links";
import { generatePartnerLink } from "../api/partners/generate-partner-link";
import { logImportError } from "../tinybird/log-import-error";
import { PartnerProps, ProgramProps, WorkspaceProps } from "../types";
import { PartnerStackApi } from "./api";
import { partnerStackImporter } from "./importer";
import { PartnerStackImportPayload, PartnerStackLink } from "./types";

export async function importLinks(payload: PartnerStackImportPayload) {
  const { importId, programId, userId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  let hasMore = true;
  let currentStartingAfter = startingAfter;

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
    select: {
      id: true,
      partner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    take: 50,
    skip: currentStartingAfter ? 1 : 0,
    ...(currentStartingAfter && {
      cursor: {
        id: currentStartingAfter,
      },
    }),
  });

  if (enrollments.length === 0) {
    hasMore = false;
  } else {
    currentStartingAfter = enrollments[enrollments.length - 1].id;
  }

  for (const { partner } of enrollments) {
    if (!partner.email) {
      console.log("Partner has no email. Skipping the link import.");
      continue;
    }

    try {
      const links = await partnerStackApi.listLinks({
        identifier: partner.email,
      });

      if (links.length === 0) {
        console.log(`No links found for partner ${partner.email}`);
        continue;
      }

      await Promise.allSettled(
        links.map(async (link) =>
          createPartnerLink({
            workspace: program.workspace as WorkspaceProps,
            program,
            partner,
            link,
            userId,
            importId,
          }),
        ),
      );
    } catch (error) {
      console.log(
        `Partner ${partner.email} doesn't exist on PartnerStack, skipping...`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await partnerStackImporter.queue({
    ...payload,
    startingAfter: hasMore ? currentStartingAfter : undefined,
    action: hasMore ? "import-links" : "import-customers",
  });
}

async function createPartnerLink({
  workspace,
  program,
  partner,
  link,
  userId,
  importId,
}: {
  workspace: WorkspaceProps;
  program: ProgramProps;
  partner: Pick<PartnerProps, "id" | "name" | "email">;
  link: PartnerStackLink;
  userId: string;
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "partnerstack",
    entity: "link",
    entity_id: link.key,
  } as const;

  const key = link.url.split("/").pop();

  if (!key) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No key found in the link ${link.url}`,
    });

    return null;
  }

  const linkFound = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: program.domain!,
        key,
      },
    },
    select: {
      partnerId: true,
    },
  });

  if (linkFound?.partnerId === partner.id) {
    console.log(
      `Partner ${partner.id} already has a link with key ${key}, skipping...`,
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
        url: link.url,
        key,
      },
      userId,
    });

    return createLink(partnerLink);
  } catch (error) {
    console.error("Error creating partner link", error, link);
    return null;
  }
}
