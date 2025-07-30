import { createId } from "@/lib/api/create-id";
import { CustomerProps, LinkProps, ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { detectFraudEvent } from "./detect-fraud-event";

interface PartnerProps {
  id: string;
  name?: string | null;
  email?: string | null;
}

export const recordFraudIfDetected = async ({
  program,
  partner,
  link,
  customer,
  click,
}: {
  program: Pick<ProgramProps, "id">;
  partner: PartnerProps;
  link: Pick<LinkProps, "id">;
  customer: Pick<CustomerProps, "id" | "name" | "email">;
  click: { 
    url: string;
    ip?: string | null;
    ua?: string | null;
  };
}) => {
  if (partner.id && !partner.name && !partner.email) {
    partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: partner.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  if (!partner) {
    throw new Error("Partner not found.");
  }

  // Get partner's IP and user agent from their associated user
  let partnerIpAddress: string | null = null;
  let partnerUserAgent: string | null = null;

  if (partner.id) {
    const partnerUser = await prisma.partnerUser.findFirst({
      where: {
        partnerId: partner.id,
      },
      include: {
        user: {
          select: {
            ipAddress: true,
            userAgent: true,
          },
        },
      },
    });

    if (partnerUser?.user) {
      // Convert IP address from bytes to string if it exists
      if (partnerUser.user.ipAddress) {
        partnerIpAddress = Buffer.from(partnerUser.user.ipAddress).toString('utf8');
      }
      partnerUserAgent = partnerUser.user.userAgent;
    }
  }

  const fraudEvent = await detectFraudEvent({
    click: {
      url: click.url,
      ip: click.ip,
      ua: click.ua,
    },
    customer: {
      email: customer.email || "",
      name: customer.name,
    },
    partner: {
      email: partner.email || "",
      name: partner.name || "",
      ipAddress: partnerIpAddress,
      userAgent: partnerUserAgent,
    },
  });

  if (!fraudEvent) {
    return;
  }

  await prisma.fraudEvent.create({
    data: {
      id: createId({ prefix: "fraud_" }),
      type: fraudEvent.type,
      programId: program.id,
      partnerId: partner.id,
      customerId: customer.id,
      linkId: link.id,
    },
  });
};
