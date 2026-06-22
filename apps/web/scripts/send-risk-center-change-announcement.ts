import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import type RiskCenterChangeAnnouncement from "@dub/email/templates/broadcasts/risk-center-change-announcement";
import { FRAUD_RULES_BY_TYPE } from "../lib/api/fraud/constants";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

const BATCH_SIZE = 50;

async function main() {
  let cursor: string | undefined;

  while (true) {
    const programs = await prisma.program.findMany({
      where: {
        workspace: {
          plan: {
            in: ["advanced", "enterprise"],
          },
        },
        fraudEventGroups: {
          some: {
            status: "pending",
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        workspace: {
          select: {
            slug: true,
            users: {
              select: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
              where: {
                user: {
                  isMachine: false,
                  email: {
                    not: null,
                  },
                },
              },
            },
          },
        },
        fraudEventGroups: {
          where: {
            status: "pending",
          },
          select: {
            id: true,
            type: true,
            eventCount: true,
            partner: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (programs.length === 0) {
      console.log("No more programs to notify.");
      break;
    }

    console.log(`Processing ${programs.length} programs...`);

    for (const program of programs) {
      try {
        if (program.fraudEventGroups.length === 0) {
          continue;
        }

        const users = program.workspace.users.map(({ user }) => user);

        if (users.length === 0) {
          console.log(`No owners found for program ${program.name}, skipping.`);
          continue;
        }

        const transformedFraudGroups = program.fraudEventGroups.map(
          ({ id, type, eventCount, partner }) => ({
            id,
            name: FRAUD_RULES_BY_TYPE[type].name,
            count: eventCount,
            partner,
          }),
        );

        await queueBatchEmail<typeof RiskCenterChangeAnnouncement>(
          users.map((user) => ({
            to: user.email!,
            subject: `[Action Required]: Review unresolved risk events for ${program.name}`,
            variant: "notifications",
            templateName: "RiskCenterChangeAnnouncement",
            templateProps: {
              email: user.email!,
              workspace: program.workspace,
              program: {
                name: program.name,
              },
              fraudGroups: transformedFraudGroups,
            },
          })),
          {
            idempotencyKey: `risk-center-announcement/${program.id}`,
          },
        );

        console.log(
          `Queued emails for program ${program.name} (${users.length} users(s))`,
        );
      } catch (error) {
        console.error(
          `Error sending email for program ${program.name}: ${error.message}`,
        );
        continue;
      }
    }

    if (programs.length < BATCH_SIZE) {
      break;
    }

    cursor = programs[programs.length - 1].id;
  }

  console.log("Done.");
}

main();
