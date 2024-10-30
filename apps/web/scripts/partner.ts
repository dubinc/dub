import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const userId = "cm1ypncqa0000tc44pfgxp6qs";
  const programId = "cm2ugxodx00015eqrtlgczd6m";
  const linkId = "cm2q86tm4000hgopgg0b54jfi";
  const partnerId = "cm2w76ajd0000wdx32wdz8o4m";

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
        programId,
        partnerId,
        subtotal: 1000,
        taxes: 0,
        total: 1000,
        payoutFee: 0,
        netTotal: 1000,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31"),
      },
      {
        programId,
        partnerId,
        subtotal: 2000,
        taxes: 0,
        total: 2000,
        payoutFee: 0,
        netTotal: 2000,
        periodStart: new Date("2024-02-01"),
        periodEnd: new Date("2024-02-28"),
      },
      {
        programId,
        partnerId,
        subtotal: 3000,
        taxes: 0,
        total: 3000,
        payoutFee: 0,
        netTotal: 3000,
        periodStart: new Date("2024-03-01"),
        periodEnd: new Date("2024-03-31"),
      },
    ],
  });
}

main();
