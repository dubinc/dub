import { prisma } from "@/lib/prisma";
import { chunk, nanoid } from "@dub/utils";
import { Customer, Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { logImportError } from "../tinybird/log-import-error";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LemonSqueezyApi } from "./api";
import { LEMONSQUEEZY_MAX_BATCHES, lemonSqueezyImporter } from "./importer";
import { LemonSqueezyCustomer, LemonSqueezyImportPayload } from "./types";

export async function importCustomers(payload: LemonSqueezyImportPayload) {
  const { importId, programId, storeId, page = 1 } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          plan: true,
          stripeConnectId: true,
        },
      },
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  const { workspace } = program;
  const { apiKey } = await lemonSqueezyImporter.getCredentials(workspace.id);
  const lemonSqueezyApi = new LemonSqueezyApi({ apiKey });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < LEMONSQUEEZY_MAX_BATCHES) {
    const customers = await lemonSqueezyApi.listCustomers({
      storeId,
      page: currentPage,
      include: "affiliates",
    });

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    // Gate: only import customers with a non-empty affiliates relationship
    const referredCustomers = customers.filter(
      (customer) => customer.affiliate_ids.length > 0,
    );

    if (referredCustomers.length > 0) {
      const affiliateIds = [
        ...new Set(
          referredCustomers.flatMap((customer) => customer.affiliate_ids),
        ),
      ];

      const links = await prisma.link.findMany({
        where: {
          domain: program.domain,
          key: {
            in: affiliateIds,
          },
        },
        select: {
          id: true,
          key: true,
          domain: true,
          url: true,
          partnerId: true,
          programId: true,
          lastLeadAt: true,
        },
      });

      const affiliateIdToLink = new Map(links.map((link) => [link.key, link]));

      const customerExternalIds = referredCustomers.map(
        (customer) => customer.id,
      );

      const existingCustomers = await prisma.customer.findMany({
        where: {
          projectId: workspace.id,
          externalId: {
            in: customerExternalIds,
          },
        },
        select: {
          id: true,
          externalId: true,
        },
      });

      const existingExternalIds = new Set(
        existingCustomers.map((customer) => customer.externalId),
      );

      const newCustomers = referredCustomers.filter(
        (customer) => !existingExternalIds.has(customer.id),
      );

      if (newCustomers.length > 0) {
        const customerChunks = chunk(newCustomers, 10);

        for (const customerChunk of customerChunks) {
          await Promise.all(
            customerChunk.map((customer) => {
              // Deterministic: first affiliate_id that has an imported partner link
              const affiliateId = customer.affiliate_ids.find((id) =>
                affiliateIdToLink.has(id),
              );

              return createCustomer({
                workspace,
                customer,
                link: affiliateId
                  ? affiliateIdToLink.get(affiliateId)
                  : undefined,
                importId,
              });
            }),
          );
        }
      }
    }

    currentPage++;
    processedBatches++;
  }

  await lemonSqueezyImporter.queue({
    ...payload,
    action: hasMore ? "import-customers" : "import-commissions",
    page: hasMore ? currentPage : undefined,
    resource: hasMore ? undefined : "orders",
  });
}

async function createCustomer({
  workspace,
  customer,
  link,
  importId,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  customer: LemonSqueezyCustomer;
  link?: Pick<
    Link,
    "id" | "key" | "domain" | "url" | "partnerId" | "programId" | "lastLeadAt"
  >;
  importId: string;
}) {
  const externalId = customer.id;

  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "lemonsqueezy" as const,
    entity: "customer" as const,
    entity_id: externalId,
  };

  if (!customer.email) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_EMAIL_NOT_FOUND",
      message: `Customer ${externalId} not imported because it has no email.`,
    });

    return;
  }

  if (!link) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No imported partner link found for customer ${externalId} (affiliates: ${customer.affiliate_ids.join(", ")}).`,
    });

    return;
  }

  const clickedAt = new Date(customer.created_at || Date.now());

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": customer.country || "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-continent": "NA",
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    clickId: nanoid(16),
    workspaceId: workspace.id,
    linkId: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    skipRatelimit: true,
    timestamp: clickedAt.toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  let createdCustomer: Customer | null = null;

  try {
    createdCustomer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name: customer.name || customer.email,
        email: customer.email,
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: clickEvent.click_id,
        linkId: link.id,
        programId: link.programId,
        partnerId: link.partnerId,
        country: customer.country || clickEvent.country,
        clickedAt,
        createdAt: clickedAt,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      console.warn(
        `Customer with external ID ${externalId} already exists. Skipping...`,
      );
    } else {
      console.error("Error creating customer", customer, error);
    }

    return;
  }

  await Promise.all([
    recordLeadWithTimestamp({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: createdCustomer.id,
      timestamp: clickedAt.toISOString(),
    }),

    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        leads: {
          increment: 1,
        },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: link.lastLeadAt,
          newTimestamp: clickedAt,
        }),
      },
    }),

    ...(link.partnerId && link.programId
      ? [
          syncPartnerLinksStats({
            partnerId: link.partnerId,
            programId: link.programId,
            eventType: "lead",
          }),
        ]
      : []),
  ]);
}
