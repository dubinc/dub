import { prisma } from "@dub/prisma";
import { PayoutStatus } from "@dub/prisma/client";
import { PAYPAL_SUPPORTED_COUNTRIES } from "@dub/utils";
import * as z from "zod/v4";
import { PartnerSchema } from "../zod/schemas/partners";
import { ProgramSchema } from "../zod/schemas/programs";

const PaypalPayoutResponseSchema = z.object({
  program: ProgramSchema.pick({
    id: true,
    name: true,
    logo: true,
  }),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    country: true,
  }),
  status: z.enum(PayoutStatus),
  amount: z.number(),
});

export type PaypalPayoutResponse = z.infer<typeof PaypalPayoutResponseSchema>;

export async function getPendingPaypalPayouts() {
  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        in: ["pending", "processing"],
      },
      partner: {
        paypalEmail: {
          not: null,
        },
        payoutsEnabledAt: {
          not: null,
        },
        country: {
          in: PAYPAL_SUPPORTED_COUNTRIES,
        },
      },
    },
    orderBy: {
      amount: "desc",
    },
    include: {
      partner: true,
      program: true,
    },
  });

  return z
    .array(PaypalPayoutResponseSchema)
    .parse(
      payouts.filter(
        (payout) => payout.amount >= payout.program.minPayoutAmount,
      ),
    );
}
