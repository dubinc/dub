import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID, nanoid } from "@dub/utils";
import "dotenv-flow/config";
import { getClickEvent, recordLeadWithTimestamp } from "../../lib/tinybird";

const referredUserEmail = "xxx@x.com";
const referredWorkspaceSlug = "xxx";
const clickId = "xxx";
const linkId = "xxx";

// backfill-attribution – backfill missing lead events for a link
async function main() {
  const referredUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: referredUserEmail,
    },
  });

  const leadTime = referredUser.createdAt;

  const referredWorkspace = await prisma.project.findUniqueOrThrow({
    where: {
      slug: referredWorkspaceSlug,
    },
  });

  if (!referredWorkspace.stripeId) {
    throw new Error("Referred workspace does not have a Stripe ID");
  }

  const dubWorkspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: DUB_WORKSPACE_ID,
    },
  });

  const clickEvent = await getClickEvent({
    clickId,
  });

  if (!clickEvent || clickEvent.data.length === 0) {
    throw new Error("Click event not found");
  }

  const clickData = clickEvent.data[0];

  const existingCustomer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: referredWorkspace.stripeId,
    },
  });

  if (!existingCustomer) {
    const customer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name: referredUser.name || referredUser.email || generateRandomName(),
        email: referredUser.email,
        avatar: referredUser.image,
        externalId: referredUser.id,
        projectId: dubWorkspace.id,
        projectConnectId: dubWorkspace.stripeConnectId,
        clickId: clickId,
        linkId: linkId,
        country: clickData.country,
        clickedAt: new Date(clickData.timestamp),
        createdAt: leadTime,
      },
    });

    console.log("recorded customer", customer);

    const leadRes = await recordLeadWithTimestamp({
      ...clickData,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customer.id,
      timestamp: leadTime.toISOString(),
    });

    console.log("recorded lead", leadRes);
  }

  // update link clicks and leads count
  const res = await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      leads: {
        increment: 1,
      },
    },
  });

  console.log(`updated link ${linkId} leads to ${res.leads}`);
}

main();
