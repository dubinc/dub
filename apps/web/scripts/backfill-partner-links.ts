import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { includeTags } from "../lib/api/links/include-tags";
import { backfillLinkCommissions } from "../lib/api/partners/backfill-link-commissions";
import { recordLink } from "../lib/tinybird";

// script to backfill partner links (including sales events if present)
async function main() {
  const link = await prisma.link.update({
    where: {
      id: "link_xxx",
    },
    data: {
      folderId: "fold_xxx",
      programId: "prog_xxx",
      partnerId: "pn_xxx",
    },
    include: includeTags,
  });

  const result = await recordLink(link);

  console.log(link, result);

  // backfill commission events if the link has sales
  if (link.saleAmount > 0 && link.partnerId && link.programId) {
    await backfillLinkCommissions({
      id: link.id,
      partnerId: link.partnerId,
      programId: link.programId,
    });
  }
}

main();
