import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { EAnalyticEvents } from "../../../../core/integration/analytic/interfaces/analytic.interface.ts";
import { trackMixpanelApiService } from "../../../../core/integration/analytic/services/track-mixpanel-api.service.ts";
import { CustomerIOClient } from "../../../../core/lib/customerio/customerio.config.ts";

/*
    This route is used to check users registered between 10 days 1 hour ago and 10 days ago and send customer.io events.
    Runs every hour (0 * * * *)
*/
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    await verifyVercelSignature(req);

    // Calculate the date range for users registered between 10 days 1 hour ago and 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const tenDaysOneHourAgo = new Date(tenDaysAgo);
    tenDaysOneHourAgo.setHours(tenDaysOneHourAgo.getHours() - 1);

    // Find users registered between 10 days 1 hour ago and 10 days ago
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: tenDaysOneHourAgo,
          lte: tenDaysAgo,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (users.length === 0) {
      await log({
        message:
          "No users found registered between 10 days 1 hour ago and 10 days ago",
        type: "cron",
      });
      return NextResponse.json({
        response: "success",
        processed: 0,
      });
    }

    // Send customer.io events for each user
    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          const featuresAccess = await checkFeaturesAccessAuthLess(user.id);

          console.log("user", user);

          // Get total clicks for all user's links
          const totalClicksResult = await prisma.$queryRaw<
            Array<{ totalUserClicks: bigint }>
          >`
            SELECT (SELECT SUM(clicks) FROM Link WHERE userId = ${user.id}) as totalUserClicks
          `;
          const totalClicks = Number(
            totalClicksResult[0]?.totalUserClicks || 0,
          );

          console.log("featuresAccess", featuresAccess);
          console.log("totalClicks", totalClicks);

          if (!featuresAccess.featuresAccess && totalClicks < 30) {
            // Send the 10-day registration event
            await CustomerIOClient.track(user.id, {
              name: "trial_expired",
              data: {
                days: 10,
              },
            });

            // Send Mixpanel event via fetch
            const mixpanelResponse = await trackMixpanelApiService({
              event: EAnalyticEvents.TRIAL_EXPIRED,
              email: user!.email!,
              userId: user.id,
              params: {
                days: 10,
                timestamp: new Date().toISOString(),
              },
            });

            if (!mixpanelResponse.ok) {
              throw new Error(
                `Mixpanel request failed: ${mixpanelResponse.status} ${await mixpanelResponse.text()}`,
              );
            }
          }

          return { success: true, userId: user.id };
        } catch (error) {
          await log({
            message: `Failed to send customer.io event for user ${user.id}: ${error.message}`,
            type: "cron",
          });
          return { success: false, userId: user.id, error: error.message };
        }
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    ).length;

    await log({
      message: `Processed ${users.length} users registered between 10 days 1 hour ago and 10 days ago. Successful: ${successful}, Failed: ${failed}`,
      type: "cron",
    });

    return NextResponse.json({
      response: "success",
      processed: users.length,
      successful,
      failed,
    });
  } catch (error) {
    await log({
      message: `Error checking users registered between 10 days 1 hour ago and 10 days ago: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
