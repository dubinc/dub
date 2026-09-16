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
    "id" | "webhookEnabled" | "stripeConnectId" | "shopifyStoreId"
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
    select: {
      programId: true,
    },
  });

  if (!group) {
    console.log(
      `Group ${partner.groupId} not found, skipping discount code creation...`,
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
      linkReward: {
        include: {
          discount: true,
        },
      },
      programEnrollment: {
        select: {
          discount: true,
        },
      },
    },
  });

  if (!partnerDefaultLink) {
    console.log(
      `No partner default link found for partner ${partner.id}, skipping discount code creation...`,
    );
    return;
  }

  const discount =
    partnerDefaultLink.linkReward?.discount ??
    partnerDefaultLink.programEnrollment?.discount;

  if (!discount) {
    console.log(
      `No discount found for partner ${partner.id}, skipping discount code creation...`,
    );
    return;
  }

  if (!discount.autoProvisionEnabledAt) {
    console.log(
      `Discount ${discount.id} does not have auto provision enabled, skipping discount code creation...`,
    );
    return;
  }

  try {
    await createDiscountCode({
      workspace,
      partner,
      link: partnerDefaultLink,
      discount,
    });
  } catch (error) {
    console.error(
      `Failed to create discount code for link ${partnerDefaultLink.id}:`,
      error,
    );
  }
}
