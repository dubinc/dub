import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { randomValue } from "@dub/utils";
import { createId } from "../api/create-id";
import { PartnerStackApi } from "./api";
import { partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

export async function importGroups(payload: PartnerStackImportPayload) {
  const { programId } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
      domain: true,
      url: true,
    },
  });

  if (!program.domain || !program.url) {
    throw new Error("Program domain or URL is not set.");
  }

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  const groups = await partnerStackApi.listGroups();

  if (groups.length > 0) {
    for (const group of groups) {
      // Default group is already created in the program creation
      if (group.default) {
        continue;
      }

      await prisma.partnerGroup.upsert({
        where: {
          programId_slug: {
            programId,
            slug: group.slug,
          },
        },
        create: {
          id: createId({ prefix: "grp_" }),
          programId,
          name: group.name,
          slug: group.slug,
          color: randomValue(RESOURCE_COLORS),
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

      console.log(`Imported group ${group.name}.`);
    }
  }

  await partnerStackImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
