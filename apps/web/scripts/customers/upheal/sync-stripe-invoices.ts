import { createId } from "@/lib/api/create-id";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { syncPartnerLinksStats } from "../../../lib/api/partners/sync-partner-links-stats";
import { stripeAppClient } from "../../../lib/stripe";
import { recordSaleWithTimestamp } from "../../../lib/tinybird";

const programId = "prog_xxx";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const customers = await prisma.customer.findMany({
    where: {
      programId,
      stripeCustomerId: {
        not: null,
      },
    },
    include: {
      link: true,
      programEnrollment: true,
    },
  });

  console.log(`Found ${customers.length} customers`);

  for (const customer of customers) {
    if (!customer.link) {
      console.log("Customer link not found:", customer);
      continue;
    }

    if (!customer.programEnrollment) {
      console.log("Customer program enrollment not found:", customer);
      continue;
    }

    const invoices = await stripeAppClient({
      mode: "live",
    }).invoices.list(
      {
        customer: customer.stripeCustomerId!,
        status: "paid",
        limit: 100,
      },
      {
        stripeAccount: program.workspace.stripeConnectId!,
      },
    );

    const existingCommissions = await prisma.commission.findMany({
      where: {
        programId,
        customerId: customer.id,
      },
    });

    const invoicesToProcess = invoices.data.filter((invoice) => {
      // skip $0 invoices
      if (invoice.amount_paid === 0) {
        return false;
      }
      const existingCommission = existingCommissions.find(
        (commission) =>
          commission.invoiceId === invoice.id ||
          (commission.amount === invoice.amount_paid &&
            new Date(commission.createdAt).getTime() >=
              new Date(invoice.created * 1000).getTime() - 60 * 60 * 1000 &&
            new Date(commission.createdAt).getTime() <=
              new Date(invoice.created * 1000).getTime() + 60 * 60 * 1000),
      );
      return !existingCommission;
    });

    if (invoicesToProcess.length === 0) {
      console.log("No invoices to process, skipping...");
      continue;
    }

    if (existingCommissions.length > 0) {
      console.log(`Found ${existingCommissions.length} existing commissions`);
      console.log(`Found ${invoicesToProcess.length} invoices to process`);
    }

    const customerLink = customer.link!;

    const salesMetadata = invoicesToProcess.map((invoice) => ({
      // extra data for commission creation
      partnerId: customerLink.partnerId,
      // sale data
      timestamp: new Date(invoice.created * 1000).toISOString(),
      customer_id: customer.id,
      event_id: nanoid(16),
      event_name: "Invoice paid",
      payment_processor: "stripe",
      invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: "usd",
      metadata: "",
      // click data
      identity_hash: customer.externalId,
      click_id: customer.clickId,
      link_id: customerLink.id,
      url: customerLink.url,
      ip: "",
      continent: "NA",
      country: "US",
      region: "Unknown",
      city: "Unknown",
      latitude: "Unknown",
      longitude: "Unknown",
      vercel_region: "",
      device: "Desktop",
      device_vendor: "Unknown",
      device_model: "Unknown",
      browser: "Unknown",
      browser_version: "Unknown",
      engine: "Unknown",
      engine_version: "Unknown",
      os: "Unknown",
      os_version: "Unknown",
      cpu_architecture: "Unknown",
      ua: "Unknown",
      bot: 0,
      qr: 0,
      referer: "(direct)",
      referer_url: "(direct)",
      trigger: "link",
    }));

    const salesMetadataParsed = salesMetadata.map((e) =>
      saleEventSchemaTB
        .extend({
          timestamp: z.string(),
        })
        .parse(e),
    );

    console.log(`Found ${salesMetadataParsed.length} sales to record`);
    console.table(salesMetadataParsed.slice(0, 10), [
      "event_id",
      "timestamp",
      "customer_id",
      "link_id",
      "amount",
      "invoice_id",
    ]);

    const tbRes = await recordSaleWithTimestamp(salesMetadataParsed);
    console.log(tbRes);

    const commissionsToCreate = salesMetadata.map((e) => ({
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId: e.partnerId!,
      rewardId: customer.programEnrollment!.saleRewardId!,
      customerId: e.customer_id,
      linkId: e.link_id,
      eventId: e.event_id,
      invoiceId: e.invoice_id,
      quantity: 1,
      amount: e.amount,
      type: "sale" as const,
      currency: "usd",
      earnings: 0,
      status: "paid" as const,
      createdAt: new Date(e.timestamp),
    }));

    console.log(`Found ${commissionsToCreate.length} commissions to create`);
    console.table(commissionsToCreate.slice(0, 10), [
      "id",
      "programId",
      "partnerId",
      "rewardId",
      "customerId",
      "linkId",
      "eventId",
    ]);
    const prismaRes = await prisma.commission.createMany({
      data: commissionsToCreate,
      skipDuplicates: true,
    });
    console.log(`Created ${prismaRes.count} commissions`);

    const totalSales = salesMetadataParsed.length;
    const totalSaleAmount = salesMetadataParsed.reduce(
      (acc, e) => acc + e.amount,
      0,
    );
    const firstSaleAt = customer.firstSaleAt
      ? undefined
      : // take the earliest sale timestamp
        salesMetadataParsed.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )[0].timestamp;

    console.log(`New sales: ${totalSales} ($${totalSaleAmount / 100} USD)`);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstSaleAt,
        sales: { increment: totalSales },
        saleAmount: { increment: totalSaleAmount },
      },
    });

    await prisma.link.update({
      where: { id: customerLink.id },
      data: {
        // need to increment conversions if no existing commissions
        ...(existingCommissions.length === 0 && {
          conversions: { increment: 1 },
        }),
        sales: { increment: totalSales },
        saleAmount: { increment: totalSaleAmount },
      },
    });

    await syncPartnerLinksStats({
      partnerId: customerLink.partnerId!,
      programId: program.id,
      eventType: "sale",
    });
  }
}

main();
