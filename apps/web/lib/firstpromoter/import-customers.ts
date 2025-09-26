import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { logImportError } from "../tinybird/log-import-error";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { FirstPromoterApi } from "./api";
import { firstPromoterImporter, MAX_BATCHES } from "./importer";
import { FirstPromoterCustomer, FirstPromoterImportPayload } from "./types";

export async function importCustomers(payload: FirstPromoterImportPayload) {
  const { importId, programId, page = 1 } = payload;

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

  const { workspace } = program;

  const credentials = await firstPromoterImporter.getCredentials(workspace.id);
  const firstPromoterApi = new FirstPromoterApi(credentials);

  let hasMore = true;
  let processedBatches = 0;
  let currentPage = page;

  while (processedBatches < MAX_BATCHES) {
    const customers = await firstPromoterApi.listCustomers({
      page: currentPage,
    });

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    // Find the partners by their email address
    const promoters = customers.map(
      ({ promoter_campaign }) => promoter_campaign.promoter,
    );

    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: promoters.map(({ email }) => email),
        },
      },
      select: {
        id: true,
      },
    });

    const partnerIds = partners.map(({ id }) => id);

    if (partnerIds.length > 0) {
      // Find the program enrollments by the partner ids
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIds,
          },
          programId,
        },
        select: {
          partner: {
            select: {
              email: true,
            },
          },
          links: {
            select: {
              id: true,
              key: true,
              domain: true,
              url: true,
              lastLeadAt: true,
            },
          },
        },
      });

      const partnerEmailToLinks = programEnrollments.reduce(
        (acc, { partner, links }) => {
          const email = partner.email!; // assert non-null
          acc[email] = (acc[email] ?? []).concat(links);
          return acc;
        },
        {} as Record<string, (typeof programEnrollments)[number]["links"]>,
      );

      await Promise.allSettled(
        customers.map((customer) => {
          const links =
            partnerEmailToLinks[customer.promoter_campaign.promoter.email] ??
            [];

          return createCustomer({
            workspace,
            links,
            customer,
            importId,
          });
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    currentPage++;
    processedBatches++;
  }

  await firstPromoterImporter.queue({
    ...payload,
    action: hasMore ? "import-customers" : "import-commissions",
    page: hasMore ? currentPage : undefined,
  });
}

async function createCustomer({
  workspace,
  links,
  customer,
  importId,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Pick<Link, "id" | "key" | "domain" | "url" | "lastLeadAt">[];
  customer: FirstPromoterCustomer;
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "firstpromoter",
    entity: "customer",
    entity_id: `${customer.id}`,
  } as const;

  if (links.length === 0) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `Link not found for customer ${customer.id}.`,
    });

    return;
  }

  if (!customer.email) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_EMAIL_NOT_FOUND",
      message: `Email not found for customer ${customer.id}.`,
    });

    return;
  }

  // Find the customer by email address
  const customerFound = await prisma.customer.findFirst({
    where: {
      projectId: workspace.id,
      OR: [{ externalId: customer.uid }, { email: customer.email }],
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
  const customerName =
    (customer.first_name && customer.last_name
      ? `${customer.first_name} ${customer.last_name}`
      : customer.first_name || customer.last_name) || customer.email;

  try {
    await prisma.customer.create({
      data: {
        id: customerId,
        name: customerName,
        email: customer.email,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: clickEvent.click_id,
        linkId: link.id,
        country: clickEvent.country,
        clickedAt: new Date(customer.created_at),
        createdAt: new Date(customer.created_at),
        externalId: customer.uid || customer.email,
      },
    });

    await Promise.allSettled([
      recordLeadWithTimestamp({
        ...clickEvent,
        event_id: nanoid(16),
        event_name: "Sign up",
        customer_id: customerId,
        timestamp: new Date(customer.created_at).toISOString(),
        metadata: customer.metadata ? JSON.stringify(customer.metadata) : "",
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
            newTimestamp: new Date(customer.created_at),
          }),
        },
      }),
    ]);
  } catch (error) {
    console.error("Error creating customer", customer, error);
  }
}
