import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltAffiliate, ToltCustomer } from "./types";

export async function importReferrals({
  programId,
  startingAfter,
}: {
  programId: string;
  startingAfter?: string;
}) {
  const { workspace } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { token, toltProgramId } = await toltImporter.getCredentials(
    workspace.id,
  );

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

    await Promise.allSettled(
      customers.map(({ partner, ...customer }) =>
        createReferral({
          workspace,
          customer,
          partner,
          links: partnerEmailToLinks.get(partner.email) ?? [],
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    startingAfter = customers[customers.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "import-referrals" : "import-commissions",
    ...(hasMore && { startingAfter }),
  });
}

// Create individual customer entries
async function createReferral({
  customer,
  workspace,
  links,
  partner,
}: {
  customer: Omit<ToltCustomer, "partner">;
  partner: ToltAffiliate;
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Pick<Link, "id" | "key" | "domain" | "url">[];
}) {
  if (links.length === 0) {
    console.log("Link not found for referral, skipping...", {
      customerEmail: customer.email,
      partnerEmail: partner.email,
    });
    return;
  }

  const customerFound = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customer.customer_id,
      },
    },
  });

  if (customerFound) {
    console.log(
      `A customer already exists with customer_id ${customer.customer_id}`,
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
        externalId: customer.customer_id,
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
