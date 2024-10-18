import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const stripeCustomers: { stripeId: string; paymentFailedAt: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("unified_payments.csv", "utf-8"), {
    header: true,
    step: (result: { data: any }) => {
      stripeCustomers.push({
        stripeId: result.data["Customer ID"],
        paymentFailedAt: result.data["Created date (UTC)"],
      });
    },
    complete: async () => {
      const validWorkspaces = await prisma.project.findMany({
        where: {
          stripeId: {
            in: stripeCustomers.map((c) => c.stripeId),
          },
          plan: {
            not: "free",
          },
        },
      });

      const workspaceToUpdate = validWorkspaces.map((w) => {
        const stripeCustomer = stripeCustomers.find(
          (c) => c.stripeId === w.stripeId,
        );
        return {
          id: w.id,
          slug: w.slug,
          plan: w.plan,
          stripeId: w.stripeId,
          paymentFailedAt: stripeCustomer?.paymentFailedAt,
        };
      });

      console.log({ stripeCustomers: stripeCustomers.length });
      console.table(workspaceToUpdate.slice(0, 10));
    },
  });
}

main();
