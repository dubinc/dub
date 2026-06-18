import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { getDomainWithoutWWW, randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { createId } from "../api/create-id";
import {
  DEFAULT_ADDITIONAL_PARTNER_LINKS,
  DEFAULT_PARTNER_GROUP,
} from "../zod/schemas/groups";
import { TapfiliateApi } from "./api";
import { tapfiliateImporter } from "./importer";
import { TapfiliateImportPayload } from "./types";

export async function importGroups(payload: TapfiliateImportPayload) {
  const { programId } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
    },
  });

  if (!program.domain || !program.url) {
    throw new Error("Program domain or URL is not set.");
  }

  const {
    logo,
    wordmark,
    brandColor,
    holdingPeriodDays,
    autoApprovePartnersEnabledAt,
    additionalLinks,
    maxPartnerLinks,
    linkStructure,
    applicationFormData,
    landerData,
  } = program.groups[0] ?? {};

  const { apiKey } = await tapfiliateImporter.getCredentials(
    program.workspaceId,
  );

  const tapfiliateApi = new TapfiliateApi({
    apiKey,
  });

  const groups = await tapfiliateApi.listGroups();

  for (const group of groups) {
    const slug = `tapfiliate-${slugify(group.id)}`;

    await prisma.partnerGroup.upsert({
      where: {
        programId_slug: {
          programId,
          slug,
        },
      },
      create: {
        id: createId({ prefix: "grp_" }),
        programId,
        name: group.title,
        slug,
        color: randomValue(RESOURCE_COLORS),
        additionalLinks: [
          {
            domain: getDomainWithoutWWW(program.url),
            validationMode: "domain",
          },
        ],
        maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
        partnerGroupDefaultLinks: {
          create: {
            id: createId({ prefix: "pgdl_" }),
            programId,
            domain: program.domain,
            url: program.url,
          },
        },
      },
      update: {},
    });

    console.log(`Imported group ${group.title}.`);
  }

  await tapfiliateImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
