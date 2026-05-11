import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import { NETWORK_PROGRAM_ID, NETWORK_WORKSPACE_ID } from "@dub/utils";
import { cookies } from "next/headers";
import { getApplicationEventCookieName } from "./utils";

export async function submitNetworkApplicationEvent(
  partner: Pick<Partner, "id" | "name" | "email" | "country">,
) {
  try {
    const cookieStore = await cookies();
    const cookieName = getApplicationEventCookieName(NETWORK_PROGRAM_ID);
    const applicationEventId = cookieStore.get(cookieName)?.value;

    if (!applicationEventId) {
      return;
    }

    const applicationEvent = await prisma.programApplicationEvent.update({
      where: {
        id: applicationEventId,
        programId: NETWORK_PROGRAM_ID,
        submittedAt: null,
      },
      data: {
        submittedAt: new Date(),
        partnerId: partner.id,
      },
      select: {
        referredByPartnerId: true,
        country: true,
        visitedAt: true,
      },
    });

    if (!applicationEvent || !applicationEvent.referredByPartnerId) {
      return;
    }

    await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        projectId: NETWORK_WORKSPACE_ID,
        programId: NETWORK_PROGRAM_ID,
        partnerId: applicationEvent.referredByPartnerId,
        name: partner.name,
        email: partner.email,
        country: partner.country,
      },
    });
  } catch (error) {}
}
