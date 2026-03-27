import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { stripeAppClient } from "../../../lib/stripe";

const programId = "prog_xxx";
const customerIdsToImport: string[] = [];

// script to export stripe invoices based on the customer's stripeCustomerId
async function main() {
  console.log(`Found ${customerIdsToImport.length} paying customers`);
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  console.log(`Found ${customerIdsToImport.length} paying customers`);

  for (const customerId of customerIdsToImport) {
    const invoices = await stripeAppClient({
      mode: "live",
    }).invoices.list(
      {
        customer: customerId,
        status: "paid",
      },
      {
        stripeAccount: program.workspace.stripeConnectId!,
      },
    );

    const invoicesToBackfill = invoices.data.map((invoice) => ({
      customerExternalId: customerId,
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

      const filePath = "scaledmail_customer_stripe_invoices.csv";
      const fileExists = fs.existsSync(filePath);

      fs.appendFileSync(
        filePath,
        Papa.unparse(invoicesToBackfill, { header: !fileExists }) + "\n",
      );
    }
  }
}

main();
