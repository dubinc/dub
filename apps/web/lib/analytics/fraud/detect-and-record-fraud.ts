import { createId } from "@/lib/api/create-id";
import { ClickEventTB, CustomerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { detectFraudEvents } from "./detect-fraud-events";

export const detectAndRecordFraud = async ({
  partner,
  customer,
  click,
  commission,
}: {
  partner: { id: string; programId: string; linkId: string };
  customer: Pick<CustomerProps, "id" | "name" | "email">;
  click: Pick<ClickEventTB, "url" | "ip" | "referer">;
  commission: { id?: string };
}) => {
  const { partner: partnerData, ...enrollment } =
    await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: partner.programId,
        },
      },
      select: {
        trustedAt: true,
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

  if (enrollment.trustedAt) {
    console.log(
      `Skipping fraud event detection for ${partner.id} because trustedAt is set`,
    );
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

  const events = await detectFraudEvents({
    click,
    customer,
    partner: {
      email: partnerData.email || "",
      name: partnerData.name || "",
      ipAddress: partnerIpAddress,
    },
  });

  if (events.length === 0) {
    console.log(`No fraud event detected for ${partner.id} and ${customer.id}`);
    return;
  }

  const fraudTypesFound = new Set(events.map(({ type }) => type));

  const eventsWithDetails = events.filter(
    ({ reasons, parameters }) => reasons || parameters,
  );

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
            selfReferral: fraudTypesFound.has("selfReferral"),
            googleAdsClick: fraudTypesFound.has("googleAdsClick"),
            disposableEmail: fraudTypesFound.has("disposableEmail"),
            programId: partner.programId,
            partnerId: partner.id,
            customerId: customer.id,
            linkId: partner.linkId,
            ...(eventsWithDetails.length > 0 && {
              details: eventsWithDetails as unknown as Prisma.InputJsonValue,
            }),
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
