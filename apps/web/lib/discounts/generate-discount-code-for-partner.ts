import { prisma } from "@/lib/prisma";
import { EnrolledPartnerProps } from "@/lib/types";
import { Project } from "@prisma/client";
import { createDiscountCode } from "./create-discount-code";

export async function generateDiscountCodeForPartner({
  workspace,
  partner,
}: {
  workspace: Pick<
    Project,
    | "id"
    | "environment"
    | "webhookEnabled"
    | "stripeConnectId"
    | "shopifyStoreId"
  >;
  partner: Pick<EnrolledPartnerProps, "id" | "name" | "groupId">;
}) {
  if (!partner.groupId) {
    console.log(
      `No group ID provided for partner ${partner.id}, skipping discount code creation...`,
    );
    return;
  }

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: partner.groupId,
    },
    include: {
      discount: true,
    },
  });

  if (!group?.discount?.autoProvisionEnabledAt) {
    console.log(
      `Group ${partner.groupId} does not have auto provision enabled, skipping discount code creation...`,
    );
    return;
  }

  const partnerDefaultLink = await prisma.link.findFirst({
    where: {
      programId: group.programId,
      partnerId: partner.id,
      partnerGroupDefaultLinkId: {
        not: null,
      },
      discountCode: {
        is: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (!partnerDefaultLink) {
    console.log(
      `No partner default link found for partner ${partner.id}, skipping discount code creation...`,
    );
    return;
  }

  try {
    await createDiscountCode({
      workspace,
      partner,
      link: partnerDefaultLink,
      discount: group.discount,
    });
  } catch (error) {
    console.error(
      `Failed to create discount code for link ${partnerDefaultLink.id}:`,
      error,
    );
  }
}
