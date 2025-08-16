import { prisma } from "@dub/prisma";
import { createId } from "../api/create-id";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { PartnerStackApi } from "./api";
import { partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

export async function importGroups(payload: PartnerStackImportPayload) {
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
      console.log(group);

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
        },
        update: {},
      });
    }
  }

  await partnerStackImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
