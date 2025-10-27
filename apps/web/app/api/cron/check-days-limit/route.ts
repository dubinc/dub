import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { TrialDays } from "@/lib/constants/trial.ts";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { EAnalyticEvents } from "../../../../core/integration/analytic/interfaces/analytic.interface.ts";
import { trackMixpanelApiService } from "../../../../core/integration/analytic/services/track-mixpanel-api.service.ts";
import { CustomerIOClient } from "../../../../core/lib/customerio/customerio.config.ts";

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    await verifyVercelSignature(req);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - TrialDays);

    const tenDaysOneHourAgo = new Date(tenDaysAgo);
    tenDaysOneHourAgo.setHours(tenDaysOneHourAgo.getHours() - 1);

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
        message: `No users found registered between ${TrialDays} days 1 hour ago and ${TrialDays} days ago`,
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

          // Get the first user's QR name from the database
          const firstQr = await prisma.qr.findFirst({
            where: {
              userId: user.id,
            },
            select: {
              title: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          });
          const firstQrName = firstQr?.title || null;

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
          console.log("firstQrName", firstQrName);

          if (!featuresAccess.featuresAccess && totalClicks < 30) {
            await CustomerIOClient.track(user.id, {
              name: "trial_expired",
              data: {
                days: TrialDays,
                qr_name: firstQrName,
              },
            });

            // Send Mixpanel event via fetch
            const mixpanelResponse = await trackMixpanelApiService({
              event: EAnalyticEvents.TRIAL_EXPIRED,
              email: user!.email!,
              userId: user.id,
              params: {
                days: TrialDays,
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
      message: `Processed ${users.length} users registered between ${TrialDays} days 1 hour ago and ${TrialDays} days ago. Successful: ${successful}, Failed: ${failed}`,
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
      message: `Error checking users registered between ${TrialDays} days 1 hour ago and ${TrialDays} days ago: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
