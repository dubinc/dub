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
        fee: 3100,
        total: 153100,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31"),
      },
      {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: 2000,
        fee: 140,
        total: 2140,
        periodStart: new Date("2024-02-01"),
        periodEnd: new Date("2024-02-28"),
      },
      {
        id: createId({ prefix: "po_" }),
        programId,
        partnerId,
        amount: 3000,
        fee: 160,
        total: 3160,
        periodStart: new Date("2024-03-01"),
        periodEnd: new Date("2024-03-31"),
      },
    ],
  });
}

main();
