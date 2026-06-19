import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { prisma } from "@/lib/prisma";
import DubLaunchWeekDay5 from "@dub/email/templates/broadcasts/launch-week-day-5";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";
import { generateUnsubscribeToken } from "../lib/email/unsubscribe-token";

async function main() {
  while (true) {
    const usersWithPartners = await prisma.user.findMany({
      where: {
        sentMail: false,
        defaultPartnerId: {
          not: null,
        },
        partners: {
          some: {},
        },
        notificationPreferences: {
          partnerAccount: true,
        },
      },
      take: 5000,
      include: {
        partners: {
          select: {
            partner: {
              select: {
                id: true,
                programs: {
                  where: {
                    programId: {
                      in: EXCLUDED_PROGRAM_IDS,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (usersWithPartners.length === 0) {
      console.log("No more users to notify");
      break;
    }

    const programEnrollmentsByPartner = await prisma.programEnrollment.groupBy({
      by: ["partnerId"],
      where: {
        partnerId: {
          in: usersWithPartners.map((user) => user.defaultPartnerId!),
        },
      },
      _count: {
        programId: true,
      },
    });

    const programEnrollmentCountsByPartnerId =
      programEnrollmentsByPartner.reduce(
        (acc, { partnerId, _count }) => {
          acc[partnerId] = _count.programId;
          return acc;
        },
        {} as Record<string, number>,
      );

    const usersToNotify = usersWithPartners.filter((user) =>
      user.partners.every(
        ({ partner }) =>
          !(
            partner.programs.length > 0 &&
            programEnrollmentCountsByPartnerId[partner.id] === 1
          ),
      ),
    );

    console.log(`Found ${usersToNotify.length} users to notify`);

    const res = await queueBatchEmail<typeof DubLaunchWeekDay5>(
      usersToNotify.map((user) => ({
        to: user.email!,
        variant: "marketing",
        subject: "Introducing the Dub Network Referral Bonus",
        templateName: "DubLaunchWeekDay5",
        templateProps: {
          email: user.email!,
          unsubscribeUrl: `https://app.dub.co/unsubscribe/${generateUnsubscribeToken(user.email!)}`,
        },
      })),
    );

    console.log(res);

    const chunkedUsersWithPartners = chunk(usersWithPartners, 1000);
    for (const cu of chunkedUsersWithPartners) {
      const res = await prisma.user.updateMany({
        where: {
          id: {
            in: cu.map((u) => u.id),
          },
        },
        data: {
          sentMail: true,
        },
      });
      console.log(`Updated ${res.count} users to sentMail: true`);
    }
  }
}

main();
