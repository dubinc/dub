import { prisma } from "@dub/prisma";
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
  console.log("commissions", commissions);

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
  console.log("payouts", payouts);

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

  const updatedLinks = await prisma.link.findMany({
    where: {
      programId,
      partnerId: newPartnerId,
    },
    include: includeTags,
  });
  console.log("updatedLinks", updatedLinks);

  const tbRes = await recordLink(updatedLinks);
  console.log("tbRes", tbRes);
}

main();
