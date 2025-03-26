import { Prisma } from "@dub/prisma/client";
import { EventType } from "@prisma/client";

export const typeAmountFilter = (
  type?: EventType,
): Prisma.CommissionWhereInput => {
  return {
    ...(type
      ? {
          type,
          ...(type === "sale" && {
            amount: {
              gt: 0,
            },
          }),
        }
      : {
          OR: [
            {
              type: "sale",
              amount: {
                gt: 0,
              },
            },
            {
              type: {
                not: "sale",
              },
            },
          ],
        }),
  };
};
