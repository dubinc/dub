import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { logImportError } from "../tinybird/log-import-error";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltCustomer, ToltImportPayload } from "./types";

export async function importCustomers(payload: ToltImportPayload) {
  let { importId, programId, toltProgramId, startingAfter } = payload;

  const { workspace } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { token } = await toltImporter.getCredentials(workspace.id);

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const customers = await toltApi.listCustomers({
      programId: toltProgramId,
      startingAfter,
    });

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: customers.map(({ partner }) => partner.email),
        },
      },
      select: {
        id: true,
      },
    });

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partners.map((partner) => partner.id),
        },
        programId,
      },
      select: {
        partner: {
          select: {
            id: true,
            email: true,
          },
        },
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

    const partnerEmailToLinks = new Map<
      string,
      (typeof programEnrollments)[0]["links"]
    >();

    for (const { partner, links } of programEnrollments) {
      if (!partner.email) {
        continue;
      }

      partnerEmailToLinks.set(partner.email, links);
    }

    // get the latest lead at for each partner link
    const partnerEmailToLatestLeadAt = customers.reduce(
      (acc, customer) => {
        if (!customer.partner.email) {
          return acc;
        }
        const existing = acc[customer.partner.email] ?? new Date(0);
        if (new Date(customer.created_at) > existing) {
          acc[customer.partner.email] = new Date(customer.created_at);
        }
        return acc;
      },
      {} as Record<string, Date>,
    );

    await Promise.allSettled(
      customers.map(({ partner, ...customer }) =>
        createReferral({
          workspace,
          customer,
          links: partnerEmailToLinks.get(partner.email) ?? [],
          latestLeadAt: partnerEmailToLatestLeadAt[partner.email],
          importId,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    startingAfter = customers[customers.length - 1].id;
  }

  await toltImporter.queue({
    ...payload,
    startingAfter: hasMore ? startingAfter : undefined,
    action: hasMore ? "import-customers" : "import-commissions",
  });
}

// Create individual customer entries
async function createReferral({
  customer,
  workspace,
  links,
  latestLeadAt,
  importId,
}: {
  customer: Omit<ToltCustomer, "partner">;
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Pick<
    Link,
    "id" | "key" | "domain" | "url" | "partnerId" | "programId" | "lastLeadAt"
  >[];
  latestLeadAt: Date;
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "tolt",
    entity: "customer",
    entity_id: customer.customer_id || customer.email || customer.id,
  } as const;

  if (links.length === 0) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `Link not found for customer ${commonImportLogInputs.entity_id}`,
    });

    return;
  }

  // if customer_id is null, use customer email or Tolt customer ID as the external ID
  const customerExternalId =
    customer.customer_id || customer.email || customer.id;

  const customerFound = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customerExternalId,
      },
    },
  });

  if (customerFound) {
    console.log(
      `A customer already exists with customerExternalId ${customerExternalId}`,
    );
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
    linkId: link.id,
    clickId: nanoid(16),
    url: link.url,
    domain: link.domain,
    key: link.key,
    workspaceId: workspace.id,
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
        externalId: customerExternalId,
      },
    });

    await Promise.allSettled([
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
