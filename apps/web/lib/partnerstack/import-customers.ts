import { prisma } from "@dub/prisma";
import { Link, Project } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { logImportError } from "../tinybird/log-import-error";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { PartnerStackApi } from "./api";
import {
  MAX_BATCHES,
  PARTNER_IDS_KEY_PREFIX,
  partnerStackImporter,
} from "./importer";
import { PartnerStackCustomer, PartnerStackImportPayload } from "./types";

export async function importCustomers(payload: PartnerStackImportPayload) {
  const { importId, programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspace: {
        select: {
          id: true,
          stripeConnectId: true,
        },
      },
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspace.id,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    let customers = await partnerStackApi.listCustomers({
      startingAfter: currentStartingAfter,
    });

    customers = customers.filter(({ test }) => !test);

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    // Identify the Partner on Dub from PS partnership_key
    const partnerKeys = [
      ...new Set(customers.map(({ partnership_key }) => partnership_key)),
    ];

    let partnerKeysToId =
      (await redis.hmget<Record<string, string | null>>(
        `${PARTNER_IDS_KEY_PREFIX}:${programId}`,
        ...partnerKeys,
      )) || {};

    partnerKeysToId = Object.fromEntries(
      Object.entries(partnerKeysToId).filter(([_, id]) => id !== null),
    );

    const partnerIds = Object.values(partnerKeysToId).filter(
      (id): id is string => id !== null,
    );

    if (partnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIds,
          },
          programId,
        },
        select: {
          partnerId: true,
          links: {
            select: {
              id: true,
              key: true,
              domain: true,
              url: true,
              partnerId: true,
              programId: true,
              lastLeadAt: true,
            },
          },
        },
      });

      const partnerIdToLinks = new Map<
        string,
        (typeof programEnrollments)[number]["links"]
      >();

      for (const { partnerId, links } of programEnrollments) {
        const existing = partnerIdToLinks.get(partnerId) ?? [];
        partnerIdToLinks.set(partnerId, [...existing, ...links]);
      }

      const partnerKeysToLatestLeadAt = customers.reduce(
        (acc, customer) => {
          if (!customer.partnership_key) {
            return acc;
          }
          const existing = acc[customer.partnership_key] ?? new Date(0);
          if (new Date(customer.created_at) > existing) {
            acc[customer.partnership_key] = new Date(customer.created_at);
          }
          return acc;
        },
        {} as Record<string, Date>,
      );

      await Promise.allSettled(
        customers.map((customer) => {
          const partnerId = partnerKeysToId[customer.partnership_key];
          const links = partnerId ? partnerIdToLinks.get(partnerId) ?? [] : [];

          return createCustomer({
            workspace: program.workspace,
            links,
            customer,
            latestLeadAt: partnerKeysToLatestLeadAt[customer.partnership_key],
            importId,
          });
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = customers[customers.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    startingAfter: hasMore ? currentStartingAfter : undefined,
    action: hasMore ? "import-customers" : "import-commissions",
  });

  if (!hasMore) {
    await redis.del(`${PARTNER_IDS_KEY_PREFIX}:${programId}`);
  }
}

async function createCustomer({
  workspace,
  links,
  customer,
  latestLeadAt,
  importId,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Pick<
    Link,
    "id" | "key" | "domain" | "url" | "partnerId" | "programId" | "lastLeadAt"
  >[];
  customer: PartnerStackCustomer;
  latestLeadAt: Date;
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "partnerstack",
    entity: "customer",
    entity_id: customer.customer_key || customer.email,
  } as const;

  if (links.length === 0) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `Link not found for customer ${customer.customer_key}.`,
    });

    return;
  }

  if (!customer.email) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_EMAIL_NOT_FOUND",
      message: `Email not found for customer ${customer.customer_key}.`,
    });

    return;
  }

  // Find the customer by email address
  const customerFound = await prisma.customer.findFirst({
    where: {
      projectId: workspace.id,
      OR: [{ email: customer.email }, { externalId: customer.customer_key }],
    },
  });

  if (customerFound) {
    console.log(`A customer already exists with email ${customer.email}`);
    return;
  }

  const link = links[0];

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": "US",
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
    timestamp: new Date(customer.created_at).toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  const customerId = createId({ prefix: "cus_" });

  try {
    await prisma.customer.create({
      data: {
        id: customerId,
        name:
          // if name is null/undefined or starts with cus_, use email as name
          !customer.name || customer.name.startsWith("cus_")
            ? customer.email
            : customer.name,
        email: customer.email,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: clickEvent.click_id,
        linkId: link.id,
        country: clickEvent.country,
        clickedAt: new Date(customer.created_at),
        createdAt: new Date(customer.created_at),
        externalId: customer.customer_key || customer.email,
      },
    });

    await Promise.all([
      recordLeadWithTimestamp({
        ...clickEvent,
        event_id: nanoid(16),
        event_name: "Sign up",
        customer_id: customerId,
        timestamp: new Date(customer.created_at).toISOString(),
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
            newTimestamp: latestLeadAt,
          }),
        },
      }),

      // partner links should always have a partnerId and programId, but we're doing this to make TS happy
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
  } catch (error) {
    console.error("Error creating customer", customer, error);
  }
}
