import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { linkCache } from "../../lib/api/links/cache";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";
import { recordLink } from "../../lib/tinybird";

let partnersToBan: string[] = [];
const bannedReason = "fraud";

async function main() {
  Papa.parse(fs.createReadStream("pplx_fraud_ban.csv", "utf-8"), {
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

      while (true) {
        const programEnrollments = await prisma.programEnrollment.findMany({
          where: {
            programId,
            status: {
              not: "banned",
            },
            partnerId: {
              in: partnersToBan,
            },
          },
          include: {
            links: true,
            partner: true,
          },
          orderBy: {
            totalCommissions: "desc",
          },
          take: 100,
        });

        if (programEnrollments.length === 0) {
          console.log("No partners found");
          break;
        }

        console.log(`Found ${programEnrollments.length} partners to ban`);

        const commonWhere = {
          programId,
          partnerId: {
            in: programEnrollments.map((p) => p.partnerId),
          },
        };

        // if there are a lot of commissions, need to cancel them first
        // for (const enrollment of programEnrollments) {
        //   while (true) {
        //     const commissions = await prisma.commission.findMany({
        //       where: {
        //         programId,
        //         partnerId: enrollment.partnerId,
        //         status: "pending",
        //       },
        //       take: 500,
        //     });

        //     if (commissions.length === 0) {
        //       break;
        //     }

        //     const res = await prisma.commission.updateMany({
        //       where: {
        //         id: {
        //           in: commissions.map((commission) => commission.id),
        //         },
        //       },
        //       data: {
        //         status: "canceled",
        //       },
        //     });
        //     console.log(
        //       `Cancelled ${res.count} commissions for partner ${enrollment.partnerId}`,
        //     );
        //   }
        // }

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

        const tbRes = await recordLink(partnerLinks, { deleted: true });
        console.log("tbRes", tbRes);

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
      }
    },
  });
}

main();
