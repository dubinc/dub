import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { TrackClient } from 'customerio-node';
import { checkFeaturesAccessAuthLess } from '@/lib/actions/check-features-access-auth-less';
import { EAnalyticEvents } from 'core/integration/analytic/interfaces/analytic.interface';

const cio = new TrackClient(process.env.CUSTOMER_IO_SITE_ID!, process.env.CUSTOMER_IO_TRACK_API_KEY!);

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
        message: "No users found registered between 10 days 1 hour ago and 10 days ago",
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

          if (!featuresAccess.featuresAccess) {
            // Send the 10-day registration event
            await cio.track(user.id, {
              name: "day_limit_reached",
            });

            // Send Mixpanel event via fetch
            const mixpanelResponse = await fetch('https://api.mixpanel.com/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([{
                event: EAnalyticEvents.DAY_LIMIT_REACHED,
                properties: {
                  distinct_id: user.id,
                  email: user.email,
                  mixpanel_user_id: user.id,
                  timestamp: new Date().toISOString(),
                  token: process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN,
                },
              }]),
            });

            if (!mixpanelResponse.ok) {
              throw new Error(`Mixpanel request failed: ${mixpanelResponse.status} ${await mixpanelResponse.text()}`);
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
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

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