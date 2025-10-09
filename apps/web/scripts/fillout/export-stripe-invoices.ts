import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { stripeAppClient } from "../../lib/stripe";

const programId = "prog_xxx";
const customersToImport: {
  externalId: string;
  referralLink: string;
  createdAt: Date;
  stripeCustomerId: string;
}[] = [];

// script to export stripe invoices based on the customer's stripeCustomerId
async function main() {
  Papa.parse(fs.createReadStream("fillout-customers-updated.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        userId: string;
        referral: string;
        stripeCustomerId: string;
        createdAt: string;
      };
    }) => {
      if (result.data.stripeCustomerId) {
        customersToImport.push({
          externalId: result.data.userId,
          referralLink: result.data.referral,
          createdAt: new Date(result.data.createdAt),
          stripeCustomerId: result.data.stripeCustomerId,
        });
      }
    },
    complete: async () => {
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      });

      console.log(`Found ${customersToImport.length} paying customers`);

      for (const customer of customersToImport) {
        const invoices = await stripeAppClient({
          livemode: true,
        }).invoices.list(
          {
            customer: customer.stripeCustomerId,
            status: "paid",
            created: {
              gte: 1751526000,
            },
          },
          {
            stripeAccount: program.workspace.stripeConnectId!,
          },
        );

        const invoicesToBackfill = invoices.data.map((invoice) => ({
          customerExternalId: customer.externalId,
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          createdAt: new Date(invoice.created * 1000).toISOString(),
        }));

        if (invoicesToBackfill.length > 0) {
          console.table(invoicesToBackfill, [
            "customerExternalId",
            "invoiceId",
            "amountPaid",
            "createdAt",
          ]);

          fs.appendFileSync(
            "fillout-invoices-updated.csv",
            Papa.unparse(invoicesToBackfill, { header: false }) + "\n",
          );
        }
      }
    },
  });
}

main();
