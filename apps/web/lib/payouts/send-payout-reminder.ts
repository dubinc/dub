import { MIN_PAYOUT_AMOUNT_FOR_REMINDERS } from "@/lib/constants/misc";
import { PAYOUT_SUPPORTED_COUNTRIES } from "@/lib/constants/payouts-supported-countries";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { prisma } from "@/lib/prisma";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import { ACME_PROGRAM_ID, DEMO_PROGRAM_ID, pluck } from "@dub/utils";
import {
  Partner,
  PayoutStatus,
  Program,
  ProgramPayoutMode,
} from "@prisma/client";

const BATCH_SIZE = 1000;

const EXCLUDED_PROGRAM_IDS = [
  ACME_PROGRAM_ID,
  DEMO_PROGRAM_ID,
  // programs that are in the migration process
  "prog_1M1EYH84K0ZGRA70CEGB4VC72",
];

type PartnerPayoutReminder = {
  partner: Pick<Partner, "id" | "name"> & {
    email: string;
  };
  programs: (Pick<Program, "id" | "name" | "logo"> & {
    amount: number;
  })[];
};

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
export async function sendPayoutReminder() {
  // Get unsent payouts grouped by partner and program, ordered by amount desc
  const unsentPayouts = await prisma.payout.groupBy({
    by: ["partnerId", "programId"],
    where: {
      status: {
        in: [
          PayoutStatus.pending,
          PayoutStatus.processing,
          PayoutStatus.processed,
          PayoutStatus.failed,
        ],
      },
      programId: {
        notIn: EXCLUDED_PROGRAM_IDS,
      },
      partner: {
        payoutsEnabledAt: null,
        AND: [
          {
            OR: [
              { country: null },
              {
                country: {
                  in: PAYOUT_SUPPORTED_COUNTRIES.map((c) => c.code),
                },
              },
            ],
          },
          {
            OR: [
              { connectPayoutsLastRemindedAt: null },
              {
                connectPayoutsLastRemindedAt: {
                  lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      amount: {
        gte: MIN_PAYOUT_AMOUNT_FOR_REMINDERS,
      },
      programEnrollment: {
        // Internal programs always pay through Dub, so those partners still need
        // to connect payout details even if a tenantId is set.
        // External and hybrid programs pay outside Dub once tenantId is set, so
        // skip those. Without a tenantId they are still included.
        OR: [
          {
            program: {
              payoutMode: ProgramPayoutMode.internal,
            },
          },
          {
            tenantId: null,
          },
        ],
      },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
    take: BATCH_SIZE,
  });

  if (!unsentPayouts.length) {
    console.log("No partners need reminders.");
    return false;
  }

  const [partnerData, programData] = await Promise.all([
    prisma.partner.findMany({
      where: {
        id: {
          in: pluck(unsentPayouts, "partnerId"),
        },
        OR: [
          {
            users: {
              none: {},
            },
          },
          {
            users: {
              some: {
                notificationPreferences: {
                  connectPayoutReminder: true,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),

    prisma.program.findMany({
      where: {
        id: {
          in: pluck(unsentPayouts, "programId"),
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    }),
  ]);

  const partnerProgramMap = new Map<string, PartnerPayoutReminder>();

  for (const payout of unsentPayouts) {
    const { partnerId, programId } = payout;
    const { amount } = payout._sum;

    const partner = partnerData.find((p) => p.id === partnerId);
    const program = programData.find((p) => p.id === programId);

    if (!partner?.email || !program) {
      continue;
    }

    if (!partnerProgramMap.has(partnerId)) {
      partnerProgramMap.set(partnerId, {
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
        },
        programs: [],
      });
    }

    partnerProgramMap.get(partnerId)!.programs.push({
      id: program.id,
      name: program.name,
      logo: program.logo!,
      amount: amount ?? 0,
    });
  }

  const partnerPrograms = Array.from(partnerProgramMap.values());
  const connectPayoutsLastRemindedAt = new Date();

  await queueBatchEmail<typeof ConnectPayoutReminder>(
    partnerPrograms.map(({ partner, programs }) => ({
      variant: "notifications",
      to: partner.email,
      subject: "Connect your payout details on Dub Partners",
      templateName: "ConnectPayoutReminder",
      templateProps: {
        email: partner.email,
        programs,
      },
    })),
  );

  await prisma.partner.updateMany({
    where: {
      id: {
        in: partnerPrograms.map(({ partner }) => partner.id),
      },
    },
    data: {
      connectPayoutsLastRemindedAt,
    },
  });

  const hasMore = unsentPayouts.length === BATCH_SIZE;

  return hasMore;
}
