import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { NOTIFICATION_PREFERENCE_TYPES } from "@/lib/constants/notification-preferences";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  token: z.string(),
  preferences: z.record(
    z.enum(NOTIFICATION_PREFERENCE_TYPES as unknown as [string, ...string[]]),
    z.boolean(),
  ),
});

// GET /api/user/notification-preferences?token=... – get notification preferences via unsubscribe link
export async function GET(request: NextRequest) {
  try {
    await ratelimitOrThrow(request, "notification-preferences");

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the token and extract the email
    const email = verifyUnsubscribeToken(token);

    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        notificationPreferences: {
          select: {
            dubLinks: true,
            dubPartners: true,
            partnerAccount: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return preferences directly (field names match schema)
    const preferences = user.notificationPreferences
      ? {
          dubLinks: user.notificationPreferences.dubLinks,
          dubPartners: user.notificationPreferences.dubPartners,
          partnerAccount: user.notificationPreferences.partnerAccount,
        }
      : {
          dubLinks: true,
          dubPartners: true,
          partnerAccount: true,
        };

    return NextResponse.json(preferences);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

// POST /api/user/notification-preferences – update notification preferences via unsubscribe link
export async function POST(request: NextRequest) {
  try {
    await ratelimitOrThrow(request, "notification-preferences");

    const body = await request.json();
    const { token, preferences } = requestSchema.parse(body);

    // Verify the token and extract the email
    const email = verifyUnsubscribeToken(token);

    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        notificationPreferences: {
          select: {
            dubLinks: true,
            dubPartners: true,
            partnerAccount: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get existing preferences or use defaults
    const existingPrefs = user.notificationPreferences || {
      dubLinks: true,
      dubPartners: true,
      partnerAccount: true,
    };

    // Merge preferences with existing values (field names now match schema directly)
    const updatedPrefs = {
      dubLinks: preferences.dubLinks ?? existingPrefs.dubLinks,
      dubPartners: preferences.dubPartners ?? existingPrefs.dubPartners,
      partnerAccount:
        preferences.partnerAccount ?? existingPrefs.partnerAccount,
    };

    // Update or create notification preferences using upsert pattern
    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationPreferences: {
          upsert: {
            create: updatedPrefs,
            update: updatedPrefs,
          },
        },
      },
    });

    // Return updated preferences
    return NextResponse.json({
      success: true,
      preferences: updatedPrefs,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
