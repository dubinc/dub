import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const stripeIds: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("business_monthly.csv", "utf-8"), {
    header: true,
    step: (result: { data: any }) => {
      stripeIds.push(result.data["Customer ID"]);
    },
    complete: async () => {
      const res = await prisma.project.updateMany({
        where: {
          // plan: "business",
          stripeId: {
            in: stripeIds,
          },
        },
        data: {
          // payoutsLimit: 0,
          payoutsLimit: 2_500_00,
        },
      });

      console.log({ res });
    },
  });
}

main();
