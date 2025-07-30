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
  click: { url: string };
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

  const fraudEvent = await detectFraudEvent({
    click: {
      url: click.url,
    },
    customer: {
      email: customer.email || "",
      name: customer.name,
    },
    partner: {
      email: partner.email || "",
      name: partner.name || "",
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
