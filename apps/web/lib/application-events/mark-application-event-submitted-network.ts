import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import {
  getDomainWithoutWWW,
  nanoid,
  NETWORK_PROGRAM_ID,
  NETWORK_WORKSPACE_ID,
} from "@dub/utils";
import { randomInt } from "crypto";
import { addSeconds } from "date-fns";
import { cookies } from "next/headers";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { recordLead } from "../tinybird";
import {
  recordClickZod,
  recordClickZodSchema,
} from "../tinybird/record-click-zod";
import { getApplicationEventCookieName } from "./utils";

export async function markApplicationEventSubmittedNetwork(
  partner: Pick<Partner, "id" | "name" | "email" | "image" | "country">,
) {
  try {
    const cookieStore = await cookies();
    const cookieName = getApplicationEventCookieName(NETWORK_PROGRAM_ID);
    const applicationEventId = cookieStore.get(cookieName)?.value;

    if (!applicationEventId) {
      return;
    }

    const applicationEvent = await prisma.programApplicationEvent.findUnique({
      where: {
        id: applicationEventId,
        programId: NETWORK_PROGRAM_ID,
      },
    });

    if (!applicationEvent) {
      console.log(
        `No application event found for new partner ${partner.id}, skipping...`,
      );
      return;
    }

    if (applicationEvent.submittedAt) {
      console.log(
        `Application event already submitted for new partner ${partner.id}, skipping...`,
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.programApplicationEvent.update({
        where: {
          id: applicationEventId,
        },
        data: {
          // assuming application starts after 15-45 seconds of visiting the page
          startedAt: addSeconds(applicationEvent.visitedAt, randomInt(15, 45)),
          submittedAt: new Date(),
          partnerId: partner.id,
        },
      });

      if (!applicationEvent.referredByPartnerId) {
        return;
      }

      await tx.partner.update({
        where: {
          id: partner.id,
          referredByPartnerId: null,
        },
        data: {
          referredByPartnerId: applicationEvent.referredByPartnerId,
        },
      });
    });

    // if the application event has a referred by partner ID and metadata, record the click and lead event
    if (applicationEvent.referredByPartnerId && applicationEvent.metadata) {
      const networkPartnerLink = await prisma.link.findFirst({
        where: {
          programId: NETWORK_PROGRAM_ID,
          partnerId: applicationEvent.referredByPartnerId,
          partnerGroupDefaultLinkId: {
            not: null,
          },
        },
      });
      if (!networkPartnerLink) {
        console.log(
          `No network partner link found for partner ${applicationEvent.referredByPartnerId}, skipping...`,
        );
        return;
      }

      const metadata = JSON.parse(applicationEvent.metadata as string);
      const click_id = nanoid(16);

      // convert stored metadata values to dub_click_events DS schema
      const generatedClickEvent = recordClickZodSchema.parse({
        ...metadata,
        timestamp: applicationEvent.visitedAt.toISOString(),
        identity_hash: partner.id,
        click_id,
        workspace_id: NETWORK_WORKSPACE_ID,
        link_id: networkPartnerLink.id,
        domain: networkPartnerLink.domain,
        key: networkPartnerLink.key,
        ...(metadata.referrer
          ? {
              referer: getDomainWithoutWWW(metadata.referrer),
              referer_url: metadata.referrer,
            }
          : {}),
      });

      await recordClickZod(generatedClickEvent);
      console.log(`Tracked click event with click_id: ${click_id}`);

      const customer = await prisma.customer.create({
        data: {
          id: createId({ prefix: "cus_" }),
          name: partner.name,
          email: partner.email,
          avatar: partner.image,
          externalId: partner.id,
          country: partner.country,
          projectId: NETWORK_WORKSPACE_ID,
          linkId: networkPartnerLink.id,
          programId: NETWORK_PROGRAM_ID,
          partnerId: applicationEvent.referredByPartnerId,
          clickId: click_id,
          clickedAt: applicationEvent.visitedAt,
        },
      });
      console.log(`Tracked customer with id: ${customer.id}`);

      await recordLead({
        ...generatedClickEvent,
        event_id: nanoid(16),
        event_name: "New partner signup",
        customer_id: customer.id,
      });
      console.log(`Tracked lead event with event_id: ${nanoid(16)}`);

      await prisma.link.update({
        where: {
          id: networkPartnerLink.id,
        },
        data: {
          clicks: {
            increment: 1,
          },
          lastClicked: applicationEvent.visitedAt,
          leads: {
            increment: 1,
          },
          lastLeadAt: new Date(),
        },
      });
      console.log(`Updated stats for link ${networkPartnerLink.id}`);

      await syncPartnerLinksStats({
        partnerId: networkPartnerLink.partnerId!,
        programId: networkPartnerLink.programId!,
        eventType: "lead",
      });
    }
  } catch (error) {}
}
