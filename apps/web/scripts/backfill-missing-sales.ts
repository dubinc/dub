import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const projectId = "xxx";
let customerSpend: {
  email: string;
  spend: number;
}[] = [];

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      projectId,
    },
    select: {
      email: true,
      externalId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  Papa.parse(fs.createReadStream("xxx.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        email: string;
        net_volume: string;
      };
    }) => {
      customerSpend.push({
        email: result.data.email,
        spend: parseFloat(result.data.net_volume),
      });
    },
    complete: () => {
      console.table(customerSpend);

      // overlap

      const overlap = customers.filter((c) =>
        customerSpend.some((cs) => cs.email === c.email),
      );

      console.table(overlap);
    },
  });
}

main();
