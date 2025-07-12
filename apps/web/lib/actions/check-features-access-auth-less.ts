"use server";

import { conn } from "@/lib/planetscale/connection";
import { checkSubscriptionStatusAuthLess } from "./check-subscription-status-auth-less";

export const checkFeaturesAccessAuthLess = async (
  userId: string,
  beforeRecord?: boolean,
) => {
  const { rows } = await conn.execute(
    `SELECT
       u.createdAt as userCreatedAt,
       u.trialEndsAt as trialEndsAt,
       u.email as email,
       (SELECT SUM(clicks) FROM Link l WHERE l.userId = u.id) as totalUserClicks
     FROM User u
     WHERE u.id = ?`,
    [userId],
  );

  const userData = rows?.[0];
  if (!userData) {
    return {
      featuresAccess: false,
      isTrialOver: true,
      isSubscribed: false,
      subscriptionNotPaid: true,
      trialEndDate: null,
    };
  }

  const { isSubscribed, subscriptionId } =
    await checkSubscriptionStatusAuthLess(userData.email);

  const totalClicks = userData.totalUserClicks || 0;
  const maxClicks = beforeRecord ? 29 : 30;

  const now = new Date();
  const createdAt = new Date(
    userData.userCreatedAt.endsWith("Z")
      ? userData.userCreatedAt
      : `${userData.userCreatedAt}Z`,
  ); // Prisma doesn't return timezone so `new Date` assumes it is local timezone although it is stored in UTC
  let trialEndsAt = userData.trialEndsAt
    ? new Date(userData.trialEndsAt)
    : null;

  if (!trialEndsAt) {
    trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);

    await conn.execute(`UPDATE User SET trialEndsAt = ? WHERE id = ?`, [
      trialEndsAt,
      userId,
    ]);
  }

  if (totalClicks >= maxClicks && now < trialEndsAt) {
    trialEndsAt = now;

    await conn.execute(`UPDATE User SET trialEndsAt = ? WHERE id = ?`, [
      trialEndsAt,
      userId,
    ]);
  }

  const isTrialOver = now > trialEndsAt;

  return {
    featuresAccess: isSubscribed || !isTrialOver,
    isTrialOver,
    isSubscribed,
    subscriptionNotPaid: !!subscriptionId && !isSubscribed,
    trialEndDate: trialEndsAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
};
