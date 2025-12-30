import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const partnersToUpdate: string[] = [];

// one time script to help update partners to the right reward tier
async function main() {
  Papa.parse(fs.createReadStream("xxx.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { Email: string } }) => {
      partnersToUpdate.push(result.data.Email);
    },
    complete: async () => {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId: "prog_xxx",
          partner: {
            email: { in: partnersToUpdate },
          },
        },
        include: {
          partner: true,
        },
      });

      //   const res = await prisma.partnerReward.createMany({
      //     skipDuplicates: true,
      //     data: programEnrollments.map((pe) => ({
      //       programEnrollmentId: pe.id,
      //       rewardId: "rw_2LBaxoHvmvO7YpqAaY2kAUMm",
      //     })),
      //   });

      //   console.log(res);

      const missingProgramEnrollments = partnersToUpdate.filter(
        (partnerEmail) =>
          !programEnrollments.some((pe) => pe.partner.email === partnerEmail),
      );

      console.log(missingProgramEnrollments);
    },
  });
}

main();
