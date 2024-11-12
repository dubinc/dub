import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_CYCu7IMAapjkRpTnr8F1azjN";
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";

  // // Create a partner account
  // const partner = await prisma.partner.create({
  //   data: {
  //     name: "Kiran (Partner)",
  //     status: "approved",
  //   },
  // });

  // // Enrol them in a program
  // await prisma.programEnrollment.create({
  //   data: {
  //     partnerId: partner.id,
  //     programId,
  //     linkId,
  //   },
  // });

  // Add some dummy payouts
  await prisma.payout.createMany({
    data: [
      {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: 150000,
        fee: 3000,
        total: 153000,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31"),
      },
      {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: 2000,
        fee: 40,
        total: 2040,
        periodStart: new Date("2024-02-01"),
        periodEnd: new Date("2024-02-28"),
      },
      {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: 3000,
        fee: 60,
        total: 3060,
        periodStart: new Date("2024-03-01"),
        periodEnd: new Date("2024-03-31"),
      },
    ],
  });
}

main();
