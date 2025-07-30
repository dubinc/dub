import { createId } from "@/lib/api/create-id";
import {
  CustomerProps,
  LinkProps,
  PartnerProps,
  ProgramProps,
} from "@/lib/types";
import { prisma } from "@dub/prisma";
import { detectFraudEvent } from "./detect-fraud-event";

export const recordFraudIfDetected = async ({
  program,
  partner,
  link,
  customer,
  click,
}: {
  program: Pick<ProgramProps, "id">;
  partner: Pick<PartnerProps, "id">;
  link: Pick<LinkProps, "id">;
  customer: Pick<CustomerProps, "id" | "name" | "email">;
  click: {
    url: string;
    ip?: string | null;
  };
}) => {
  const partnerData = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partner.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      users: {
        select: {
          user: {
            select: {
              ipAddress: true,
            },
          },
        },
      },
    },
  });

  // Get partner's IP address from their associated user
  let partnerIpAddress: string | null = null;

  if (partnerData.users.length > 0) {
    const partnerUser = partnerData.users[0]?.user;

    if (partnerUser?.ipAddress) {
      partnerIpAddress = partnerUser.ipAddress.toString("utf8");
    }
  }

  const fraudEvent = await detectFraudEvent({
    click: {
      url: click.url,
      ip: click.ip,
    },
    customer: {
      email: customer.email || "",
      name: customer.name,
    },
    partner: {
      email: partnerData.email || "",
      name: partnerData.name || "",
      ipAddress: partnerIpAddress,
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
