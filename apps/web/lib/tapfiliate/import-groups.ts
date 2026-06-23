import { prisma } from "@/lib/prisma";
import { RESOURCE_COLORS } from "@/ui/colors";
import { getDomainWithoutWWW, randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { createId } from "../api/create-id";
import { DEFAULT_ADDITIONAL_PARTNER_LINKS } from "../zod/schemas/groups";
import { TapfiliateApi } from "./api";
import { tapfiliateImporter } from "./importer";
import { TapfiliateImportPayload } from "./types";

export async function importGroups(payload: TapfiliateImportPayload) {
  const { programId } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
      domain: true,
      url: true,
      defaultGroupId: true,
      groups: {
        select: {
          id: true,
          linkStructure: true,
          holdingPeriodDays: true,
          maxPartnerLinks: true,
        },
      },
    },
  });

  if (!program.domain || !program.url) {
    throw new Error("Program domain or URL is not set.");
  }

  const defaultGroup = program.groups.find(
    (group) => group.id === program.defaultGroupId,
  );

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
        ...(defaultGroup
          ? {
              linkStructure: defaultGroup.linkStructure,
              holdingPeriodDays: defaultGroup.holdingPeriodDays,
              maxPartnerLinks: defaultGroup.maxPartnerLinks,
            }
          : {
              maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
            }),
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
