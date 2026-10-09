import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird/record-link";
import "dotenv-flow/config";

const DRY_RUN = true;
const programId = "prog_xxx";
const KEEP_GROUP_ID = "grp_xxx";
const BATCH_SIZE = 100;

async function main() {
  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      tenantId: { not: null },
    },
    select: {
      partnerId: true,
      groupId: true,
      tenantId: true,
    },
  });

  const partnerIds = partners
    .filter(({ groupId }) => groupId !== KEEP_GROUP_ID)
    .map(({ partnerId }) => partnerId);

  console.log(
    `${partners.length} partners have a tenantId. ${partnerIds.length} are not in ${KEEP_GROUP_ID}.`,
  );

  if (DRY_RUN) {
    console.log(partnerIds.join("\n"));
    return;
  }

  let enrollmentsUpdated = 0;
  let linksUpdated = 0;

  for (let index = 0; index < partnerIds.length; index += BATCH_SIZE) {
    const batch = partnerIds.slice(index, index + BATCH_SIZE);

    const [enrollments, links] = await prisma.$transaction([
      prisma.programEnrollment.updateMany({
        where: { programId, partnerId: { in: batch } },
        data: { tenantId: null },
      }),
      prisma.link.updateMany({
        where: { programId, partnerId: { in: batch }, tenantId: { not: null } },
        data: { tenantId: null },
      }),
    ]);

    enrollmentsUpdated += enrollments.count;
    linksUpdated += links.count;

    // tags and programEnrollment are required, otherwise recordLink overwrites
    // tag_ids, partner_group_id and partner_tag_ids in Tinybird with empty values
    const updatedLinks = await prisma.link.findMany({
      where: { programId, partnerId: { in: batch } },
      include: { ...includeTags, ...includeProgramEnrollment },
    });

    if (updatedLinks.length > 0) {
      try {
        await recordLink(updatedLinks);
      } catch (error) {
        console.error(
          `Failed to record ${updatedLinks.length} links in Tinybird for partners: ${batch.join(", ")}`,
          error,
        );
      }
    }

    console.log(
      `Cleared tenantId on ${enrollmentsUpdated} partners and ${linksUpdated} links so far.`,
    );
  }

  console.log(
    `Finished. Cleared tenantId on ${enrollmentsUpdated} partners and ${linksUpdated} links.`,
  );
}

main();
