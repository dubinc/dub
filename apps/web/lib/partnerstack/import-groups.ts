import { prisma } from "@dub/prisma";
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

      console.log(`Imported group ${group.name}.`);
    }
  }

  await partnerStackImporter.queue({
    ...payload,
    action: "import-partners",
  });
}
