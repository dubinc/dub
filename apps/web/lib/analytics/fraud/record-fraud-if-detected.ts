import { createId } from "@/lib/api/create-id";
import {
  CustomerProps,
  LinkProps,
  PartnerProps,
  ProgramProps,
} from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { detectFraudEvent } from "./detect-fraud-event";

export const recordFraudIfDetected = async ({
  program,
  partner,
  link,
  customer,
  commission,
  click,
}: {
  program: Pick<ProgramProps, "id">;
  partner: Pick<PartnerProps, "id">;
  link: Pick<LinkProps, "id">;
  customer: Pick<CustomerProps, "id" | "name" | "email">;
  commission?: {
    id?: string;
  };
  click: {
    url: string;
    ip?: string | null;
  };
}) => {
  const { partner: partnerData, ...enrollment } =
    await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      select: {
        ignoreFraudEventsEnabledAt: true,
        status: true,
        partner: {
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
        },
      },
    });

  if (enrollment.ignoreFraudEventsEnabledAt) {
    return;
  }

  // Get partner's IP address from their associated user
  let partnerIpAddress: string | null = null;

  if (partnerData.users.length > 0) {
    const partnerUser = partnerData.users[0]?.user;

    if (partnerUser?.ipAddress) {
      partnerIpAddress = partnerUser.ipAddress.toString("utf8");
    }
  }

  const result = await detectFraudEvent({
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

  if (!result) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      let fraudEvent = await tx.fraudEvent.findUnique({
        where: {
          partnerId_customerId: {
            partnerId: partner.id,
            customerId: customer.id,
          },
        },
      });

      if (!fraudEvent) {
        fraudEvent = await tx.fraudEvent.create({
          data: {
            id: createId({ prefix: "fraud_" }),
            type: result.type,
            programId: program.id,
            partnerId: partner.id,
            customerId: customer.id,
            linkId: link.id,
          },
        });
      }

      if (commission?.id) {
        await tx.commission.update({
          where: {
            id: commission.id,
          },
          data: {
            fraudEventId: fraudEvent.id,
            status: "held",
          },
        });
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }

    console.error("Error creating fraud event", error);

    await log({
      message: `Error creating fraud event - ${error.message}`,
      type: "errors",
      mention: true,
    });
  }
};
