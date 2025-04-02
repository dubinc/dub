import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { subMinutes } from "date-fns";
import "dotenv-flow/config";
import { getClickEvent } from "../lib/tinybird";

const email = "";
const clickId = "";
const linkId = "";
const workspaceId = "";

// backfill-attribution – backfill missing click/lead attribution events for a link
async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const clickEvent = await getClickEvent({
    clickId,
  });
  if (!clickEvent || clickEvent.data.length === 0) {
    throw new Error("Click event not found");
  }

  const clickTime = subMinutes(user.createdAt, 15);
  const leadTime = user.createdAt;

  const newClickEvent = {
    ...clickEvent.data[0],
    alias_link_id: "",
    vercel_region: "",
    timestamp: clickTime.toISOString(),
    click_id: nanoid(16),
    link_id: linkId,
  };

  console.log("newClickEvent", newClickEvent);

  const clickRes = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      body: JSON.stringify(newClickEvent),
    },
  );

  console.log("clickRes", clickRes);

  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      name: user.name || user.email || generateRandomName(),
      email: user.email,
      avatar: user.image,
      externalId: user.id,
      projectId: workspaceId,
      projectConnectId: workspace.stripeConnectId,
      clickId: clickId,
      linkId: linkId,
      country: newClickEvent.country,
      clickedAt: clickTime,
      createdAt: leadTime,
    },
  });

  console.log("customer", customer);

  const leadRes = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_lead_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      body: JSON.stringify({
        ...newClickEvent,
        timestamp: leadTime.toISOString(),
        event_id: nanoid(16),
        event_name: "Sign Up",
        customer_id: customer.id,
        metadata: JSON.stringify({}),
      }),
    },
  );

  console.log("leadRes", leadRes);

  // update link clicks and leads count
  const res = await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      clicks: {
        increment: 1,
      },
      leads: {
        increment: 1,
      },
    },
  });

  console.log(
    `updated link ${linkId} clicks to ${res.clicks} and leads to ${res.leads}`,
  );
}

main();
