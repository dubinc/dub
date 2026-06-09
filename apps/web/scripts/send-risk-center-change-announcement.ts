import "dotenv-flow/config";

import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import type RiskCenterChangeAnnouncement from "@dub/email/templates/broadcasts/risk-center-change-announcement";
import { prisma } from "@dub/prisma";

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
        const { users } = await getWorkspaceUsers({
          programId: program.id,
          role: "owner",
        });

        if (users.length === 0) {
          console.log(`No owners found for program ${program.name}, skipping.`);
          continue;
        }

        await queueBatchEmail<typeof RiskCenterChangeAnnouncement>(
          users.map((user) => ({
            to: user.email,
            subject: `Updates to fraud protection for ${program.name}`,
            variant: "notifications",
            templateName: "RiskCenterChangeAnnouncement",
            templateProps: {
              email: user.email,
              workspace: program.workspace,
              program: {
                name: program.name,
              },
            },
          })),
          {
            idempotencyKey: `risk-center-announcement/${program.id}`,
          },
        );

        console.log(
          `Queued emails for program ${program.name} (${users.length} owner(s))`,
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
