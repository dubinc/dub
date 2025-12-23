import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const eligiblePartners = await prisma.partner.findMany({
    where: {
      programs: {
        some: {
          programId: {
            notIn: EXCLUDED_PROGRAM_IDS,
          },
          status: "approved",
          totalCommissions: {
            gte: 10_00,
          },
        },
        none: {
          status: "banned",
        },
      },
      //   AND: [
      //     {
      //       OR: [
      //         {
      //           website: {
      //             equals: "",
      //           },
      //         },
      //         { website: null },
      //       ],
      //     },
      //     {
      //       OR: [
      //         {
      //           youtube: {
      //             equals: "",
      //           },
      //         },
      //         { youtube: null },
      //       ],
      //     },
      //     {
      //       OR: [
      //         {
      //           twitter: {
      //             equals: "",
      //           },
      //         },
      //         { twitter: null },
      //       ],
      //     },
      //     {
      //       OR: [
      //         {
      //           linkedin: {
      //             equals: "",
      //           },
      //         },
      //         { linkedin: null },
      //       ],
      //     },
      //     {
      //       OR: [
      //         {
      //           instagram: {
      //             equals: "",
      //           },
      //         },
      //         { instagram: null },
      //       ],
      //     },
      //     {
      //       OR: [
      //         {
      //           tiktok: {
      //             equals: "",
      //           },
      //         },
      //         { tiktok: null },
      //       ],
      //     },
      //   ],
    },
    include: {
      programs: true,
    },
  });

  console.table(eligiblePartners, ["name", "email"]);

  const discoveredRes = await prisma.partner.updateMany({
    where: {
      discoverableAt: null,
      id: {
        in: eligiblePartners.map((partner) => partner.id),
      },
    },
    data: { discoverableAt: new Date() },
  });
  console.log(`Updated ${discoveredRes.count} partners to be discoverable`);

  const notDiscoveredRes = await prisma.partner.updateMany({
    where: {
      discoverableAt: {
        not: null,
      },
      id: {
        notIn: eligiblePartners.map((partner) => partner.id),
      },
    },
    data: { discoverableAt: null },
  });
  console.log(
    `Updated ${notDiscoveredRes.count} partners to be not discoverable`,
  );
}

main();
