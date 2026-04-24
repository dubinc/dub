import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { EnrolledPartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { createDiscountCode } from "./create-discount-code";

export async function generateDiscountCodeForPartner({
  workspaceId,
  partner,
}: {
  workspaceId: string;
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

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: workspaceId,
    },
    select: {
      stripeConnectId: true,
      installedIntegrations: {
        where: {
          integrationId: STRIPE_INTEGRATION_ID,
        },
      },
    },
  });

  if (!workspace.stripeConnectId) {
    console.log("Workspace does not have stripeConnectId");
    return;
  }

  if (!workspace.installedIntegrations.length) {
    console.log("Workspace does not have the Stripe integration installed");
    return;
  }

  const stripeIntegrationSettings = stripeIntegrationSettingsSchema.parse(
    workspace.installedIntegrations[0].settings || {},
  );

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
      stripeConnectId: workspace.stripeConnectId,
      stripeMode: stripeIntegrationSettings.stripeMode,
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
