import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { stripeAppClient } from "../../lib/stripe";

const programId = "prog_1K89GZ21QE2YC296FHHBMCFSM";
type CustomerData = {
  customerExternalId: string;
  partnerLinkKey: string;
  stripeCustomerId?: string;
  timestamp: string;
};
const customersToImport: CustomerData[] = [];

// script to export stripe invoices based on the customer's stripeCustomerId
async function main() {
  Papa.parse(fs.createReadStream("customers.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: CustomerData }) => {
      if (result.data.stripeCustomerId) {
        customersToImport.push(result.data);
      }
    },
    complete: async () => {
      console.log(`Found ${customersToImport.length} paying customers`);
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
          mode: "live",
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
          customerExternalId: customer.customerExternalId,
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

          const filePath = "customer_stripe_invoices.csv";
          const fileExists = fs.existsSync(filePath);

          fs.appendFileSync(
            filePath,
            Papa.unparse(invoicesToBackfill, { header: !fileExists }) + "\n",
          );
        }
      }
    },
  });
}

main();
