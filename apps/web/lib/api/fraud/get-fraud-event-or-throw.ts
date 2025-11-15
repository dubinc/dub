import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export async function getFraudEventOrThrow({
  fraudEventId,
  programId,
}: {
  fraudEventId: string;
  programId: string;
}) {
  const fraudEvent = await prisma.fraudEvent.findUnique({
    where: {
      id: fraudEventId,
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      link: {
        select: {
          id: true,
          key: true,
          domain: true,
        },
      },
    },
  });

  if (!fraudEvent) {
    throw new DubApiError({
      code: "not_found",
      message: "Fraud event not found.",
    });
  }

  if (fraudEvent.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to access this fraud event.",
    });
  }

  return {
    ...fraudEvent,
    createdAt: new Date(fraudEvent.createdAt),
    updatedAt: new Date(fraudEvent.updatedAt),
    resolvedAt: fraudEvent.resolvedAt ? new Date(fraudEvent.resolvedAt) : null,
  };
}
