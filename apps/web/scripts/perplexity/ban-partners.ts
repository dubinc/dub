import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { linkCache } from "../../lib/api/links/cache";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";

let partnersToBan: string[] = [];
const bannedReason = "fraud";

async function main() {
  Papa.parse(fs.createReadStream("pplx_banned_partners.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        PARTNER_ID: string;
      };
    }) => {
      if (result.data.PARTNER_ID) {
        partnersToBan.push(result.data.PARTNER_ID);
      }
    },
    complete: async () => {
      const programId = "prog_xxx";
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
      });

      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnersToBan,
          },
          status: {
            not: "banned",
          },
        },
        include: {
          links: true,
          partner: true,
        },
        take: 200,
      });

      if (programEnrollments.length === 0) {
        console.log("No partners found");
        return;
      }

      const commonWhere = {
        programId,
        partnerId: {
          in: programEnrollments.map((p) => p.partnerId),
        },
      };

      const prismaRes = await prisma.$transaction([
        prisma.link.updateMany({
          where: commonWhere,
          data: {
            disabledAt: new Date(),
            expiresAt: new Date(),
          },
        }),

        prisma.programEnrollment.updateMany({
          where: commonWhere,
          data: {
            status: "banned",
            bannedAt: new Date(),
            bannedReason,
            groupId: null,
            clickRewardId: null,
            leadRewardId: null,
            saleRewardId: null,
            discountId: null,
          },
        }),
        prisma.commission.updateMany({
          where: {
            ...commonWhere,
            status: "pending",
          },
          data: {
            status: "canceled",
          },
        }),

        prisma.payout.updateMany({
          where: {
            ...commonWhere,
            status: "pending",
          },
          data: {
            status: "canceled",
          },
        }),

        prisma.bountySubmission.updateMany({
          where: {
            ...commonWhere,
            status: {
              not: "approved",
            },
          },
          data: {
            status: "rejected",
          },
        }),
      ]);
      console.log("prismaRes", prismaRes);

      const partnerLinks = programEnrollments.flatMap((p) => p.links);
      const redisRes = await linkCache.expireMany(partnerLinks);
      console.log("redisRes", redisRes);

      const commissionsRes = await Promise.all(
        programEnrollments.map(({ partner }) =>
          syncTotalCommissions({
            partnerId: partner.id,
            programId,
          }),
        ),
      );

      console.log("commissionsRes", commissionsRes);

      const qstashRes = await queueBatchEmail<typeof PartnerBanned>(
        programEnrollments
          .filter((p) => p.partner.email)
          .map((p) => ({
            to: p.partner.email!,
            subject: `You've been banned from the ${program.name} Partner Program`,
            variant: "notifications",
            replyTo: program.supportEmail || "noreply",
            templateName: "PartnerBanned",
            templateProps: {
              partner: {
                name: p.partner.name,
                email: p.partner.email!,
              },
              program: {
                name: program.name,
                slug: program.slug,
              },
              bannedReason: BAN_PARTNER_REASONS[bannedReason],
            },
          })),
      );
      console.log("qstashRes", qstashRes);
    },
  });
}

main();
