import { withAdmin } from "@/lib/auth/admin";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { PayoutStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const StablecoinPayoutResponseSchema = z.object({
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

const stablecoinPayoutsQuerySchema = z.object({
  country: z.string().optional(),
  programId: z.string().optional(),
  status: z.enum(PayoutStatus).optional(),
});

export const GET = withAdmin(async ({ searchParams }) => {
  const { country, programId, status } =
    stablecoinPayoutsQuerySchema.parse(searchParams);

  const payouts = await prisma.payout.findMany({
    where: {
      ...(status && { status }),
      ...(programId && { programId }),
      partner: {
        defaultPayoutMethod: "stablecoin",
        stripeRecipientId: {
          not: null,
        },
        cryptoWalletAddress: {
          not: null,
        },
        payoutsEnabledAt: {
          not: null,
        },
        ...(country && { country }),
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

  return NextResponse.json(
    z
      .array(StablecoinPayoutResponseSchema)
      .parse(
        payouts.filter(
          (payout) =>
            (
              payout as typeof payout & {
                program?: { minPayoutAmount: number };
              }
            ).program &&
            payout.amount >=
              (
                payout as typeof payout & {
                  program: { minPayoutAmount: number };
                }
              ).program.minPayoutAmount,
        ),
      ),
  );
});
