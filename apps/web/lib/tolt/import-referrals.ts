import { prisma } from "@dub/prisma";
import { Link, Project } from "@prisma/client";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltCustomer } from "./types";

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

    if (partners.length === 0) {
      console.log("No partners found for customers, skipping...");
      return;
    }

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partners.map((partner) => partner.id),
        },
        programId,
      },
      select: {
        partnerId: true,
        links: true,
      },
    });

    const partnerLinksMap = new Map(
      programEnrollments.map(({ partnerId, links }) => [partnerId, links]),
    );

    await Promise.all(
      customers.map((customer) =>
        createCustomer({
          workspace,
          links: partnerLinksMap.get(customer.partner.email) ?? [],
          customer,
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
async function createCustomer({
  customer,
  workspace,
  links,
}: {
  customer: ToltCustomer;
  workspace: Pick<Project, "id" | "stripeConnectId">;
  links: Link[];
}) {
  if (links.length === 0) {
    console.log(`Link not found for referral ${customer.id}, skipping...`);
    return;
  }

  // if (
  //   !referral.stripe_customer_id ||
  //   !referral.stripe_customer_id.startsWith("cus_")
  // ) {
  //   console.log(
  //     `No Stripe customer ID provided for referral ${referralId}, skipping...`,
  //   );
  //   return;
  // }

  // const customerFound = await prisma.customer.findUnique({
  //   where: {
  //     stripeCustomerId: referral.stripe_customer_id,
  //   },
  // });

  // if (customerFound) {
  //   console.log(
  //     `A customer already exists with Stripe customer ID ${referral.stripe_customer_id}`,
  //   );
  //   return;
  // }

  // const dummyRequest = new Request(link.url, {
  //   headers: new Headers({
  //     "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  //     "x-forwarded-for": "127.0.0.1",
  //     "x-vercel-ip-country": "US",
  //     "x-vercel-ip-country-region": "CA",
  //     "x-vercel-ip-continent": "NA",
  //   }),
  // });

  // const clickData = await recordClick({
  //   req: dummyRequest,
  //   linkId: link.id,
  //   clickId: nanoid(16),
  //   url: link.url,
  //   domain: link.domain,
  //   key: link.key,
  //   workspaceId: workspace.id,
  //   skipRatelimit: true,
  //   timestamp: new Date(customer.created_at).toISOString(),
  // });

  // const clickEvent = clickEventSchemaTB.parse({
  //   ...clickData,
  //   bot: 0,
  //   qr: 0,
  // });

  // const customerId = createId({ prefix: "cus_" });

  // await Promise.all([
  //   prisma.customer.create({
  //     data: {
  //       id: customerId,
  //       name:
  //         // if name is null/undefined or starts with cus_, use email as name
  //         !customer.name || customer.name.startsWith("cus_")
  //           ? customer.email
  //           : customer.name,
  //       email: customer.email,
  //       projectId: workspace.id,
  //       projectConnectId: workspace.stripeConnectId,
  //       clickId: clickEvent.click_id,
  //       linkId: link.id,
  //       country: clickEvent.country,
  //       // clickedAt: new Date(customer.created_at),
  //       // createdAt: new Date(customer.became_lead_at),
  //       // externalId: customer.customer_id,
  //       // stripeCustomerId: customer.stripe_customer_id,
  //     },
  //   }),

  //   recordLeadWithTimestamp({
  //     ...clickEvent,
  //     event_id: nanoid(16),
  //     event_name: "Sign up",
  //     customer_id: customerId,
  //     // timestamp: new Date(referral.became_lead_at).toISOString(),
  //   }),

  //   prisma.link.update({
  //     where: { id: link.id },
  //     data: { leads: { increment: 1 } },
  //   }),
  // ]);
}
