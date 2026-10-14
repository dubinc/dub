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
  let totalSkipped = 0;
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
      const settings = workspace.installedIntegrations[0]?.settings as
        | { stripeMode?: unknown }
        | null
        | undefined;

      // Parse only stripeMode so unrelated invalid settings don't reset the mode to live
      const parsed = stripeIntegrationSettingsSchema.shape.stripeMode.safeParse(
        settings?.stripeMode,
      );

      return {
        id: workspace.id,
        stripeConnectId: workspace.stripeConnectId!,
        stripeConnectMode: parsed.success ? parsed.data : "live",
      };
    });

    if (DRY_RUN) {
      console.table(updates);
      totalUpdated += updates.length;
    } else {
      const results = await Promise.all(
        updates.map(async ({ id, stripeConnectId, stripeConnectMode }) => {
          // Skip workspaces whose connection changed after they were selected
          const { count } = await prisma.project.updateMany({
            where: {
              id,
              stripeConnectId,
              stripeConnectMode: null,
            },
            data: {
              stripeConnectMode,
            },
          });

          if (count === 0) {
            console.log(
              `Skipped workspace ${id} (${stripeConnectId}): connection changed during backfill`,
            );
          } else {
            console.log(
              `Set stripeConnectMode=${stripeConnectMode} for workspace ${id} (${stripeConnectId})`,
            );
          }

          return count;
        }),
      );

      const updated = results.reduce((sum, count) => sum + count, 0);

      totalUpdated += updated;
      totalSkipped += updates.length - updated;
    }

    console.log(
      `${DRY_RUN ? "Would backfill" : "Processed"} ${updates.length} workspaces up to ${cursor}`,
    );
  }

  console.log(
    DRY_RUN
      ? `Done. Would backfill ${totalUpdated} workspaces.`
      : `Done. Backfilled ${totalUpdated} workspaces, skipped ${totalSkipped}.`,
  );
}

main();
