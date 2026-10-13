import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { prisma } from "@/lib/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 100;

// Backfill Project.stripeConnectMode from the Stripe installation settings
// Run after adding the nullable column and before swapping the stripeConnectId unique index
async function main() {
  let totalUpdated = 0;
  let cursor: string | undefined;

  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        stripeConnectId: {
          not: null,
        },
        stripeConnectMode: null,
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
      },
      select: {
        id: true,
        stripeConnectId: true,
        installedIntegrations: {
          where: {
            integrationId: STRIPE_INTEGRATION_ID,
          },
          select: {
            settings: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (workspaces.length === 0) {
      break;
    }

    cursor = workspaces[workspaces.length - 1].id;

    const updates = workspaces.map((workspace) => {
      const parsed = stripeIntegrationSettingsSchema.safeParse(
        workspace.installedIntegrations[0]?.settings ?? {},
      );

      return {
        id: workspace.id,
        stripeConnectId: workspace.stripeConnectId,
        stripeConnectMode: parsed.success ? parsed.data.stripeMode : "live",
      };
    });

    if (DRY_RUN) {
      console.table(updates);
    } else {
      await Promise.all(
        updates.map(async ({ id, stripeConnectId, stripeConnectMode }) => {
          await prisma.project.update({
            where: {
              id,
            },
            data: {
              stripeConnectMode,
            },
          });

          console.log(
            `Set stripeConnectMode=${stripeConnectMode} for workspace ${id} (${stripeConnectId})`,
          );
        }),
      );
    }

    totalUpdated += updates.length;

    console.log(
      `${DRY_RUN ? "Would backfill" : "Backfilled"} ${updates.length} workspaces up to ${cursor}`,
    );
  }

  console.log(
    `Done. ${DRY_RUN ? "Would backfill" : "Backfilled"} ${totalUpdated} workspaces.`,
  );
}

main();
