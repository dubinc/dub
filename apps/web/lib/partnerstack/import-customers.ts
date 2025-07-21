import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { recordLeadWithTimestamp } from "../tinybird";
import { recordFakeClick } from "../tinybird/record-fake-click";
import { redis } from "../upstash";
import { PartnerStackApi } from "./api";
import {
  MAX_BATCHES,
  PARTNER_IDS_KEY_PREFIX,
  partnerStackImporter,
} from "./importer";
import { PartnerStackCustomer, PartnerStackImportPayload } from "./types";

export async function importCustomers(payload: PartnerStackImportPayload) {
  const { programId, startingAfter } = payload;

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
              projectId: true,
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

      await Promise.allSettled(
        customers.map((customer) => {
          const partnerId = partnerKeysToId[customer.partnership_key];
          const links = partnerId ? partnerIdToLinks.get(partnerId) ?? [] : [];

          return createCustomer({
            workspace: program.workspace,
            links,
            customer,
          });
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = customers[customers.length - 1].key;
  }

  delete payload?.startingAfter;

  await partnerStackImporter.queue({
    ...payload,
    ...(hasMore && { startingAfter: currentStartingAfter }),
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
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Pick<Link, "id" | "key" | "domain" | "url" | "projectId">[];
  customer: PartnerStackCustomer;
}) {
  if (links.length === 0) {
    console.log(
      `Link not found for customer. See the details at https://app.partnerstack.com/partners/${customer.partnership_key}/details`,
    );
    return;
  }

  if (!customer.email) {
    console.log("Customer email not found, skipping...");
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

  const clickEvent = await recordFakeClick({
    link,
    timestamp: customer.created_at,
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
        },
      }),
    ]);
  } catch (error) {
    console.error("Error creating customer", customer, error);
  }
}
