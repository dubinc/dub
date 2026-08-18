import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { includeTags } from "../../lib/api/links/include-tags";
import { recordLink } from "../../lib/tinybird/record-link";

// merge partner profiles
const oldPartnerId = "pn_xxx";
const newPartnerId = "pn_xxx";
const programId = "prog_xxx";

async function main() {
  // update programEnrollment

  const programEnrollment = await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId: oldPartnerId,
        programId,
      },
    },
    data: {
      partnerId: newPartnerId,
    },
  });
  console.log("programEnrollment", programEnrollment);

  // update commissions

  const commissions = await prisma.commission.updateMany({
    where: {
      programId,
      partnerId: oldPartnerId,
    },
    data: {
      partnerId: newPartnerId,
    },
  });

  // update payouts

  const payouts = await prisma.payout.updateMany({
    where: {
      programId,
      partnerId: oldPartnerId,
    },
    data: {
      partnerId: newPartnerId,
    },
  });

  // update links + recordLink in TB
  await prisma.link.updateMany({
    where: {
      programId,
      partnerId: oldPartnerId,
    },
    data: {
      partnerId: newPartnerId,
    },
  });

  // Queue an index update for the reassigned enrollment, ahead of the
  // Tinybird write below.
  await queuePartnerSearchSync({ enrollmentIds: [programEnrollment.id] });

  const updatedLinks = await prisma.link.findMany({
    where: {
      programId,
      partnerId: newPartnerId,
    },
    include: {
      ...includeTags,
      ...includeProgramEnrollment,
    },
  });

  console.log("updatedLinks", updatedLinks);

  const tbRes = await recordLink(updatedLinks);
  console.log("tbRes", tbRes);
}

main();
