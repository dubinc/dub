"use server";

import { conn } from "@/lib/planetscale/connection";
import { checkSubscriptionStatusAuthLess } from "./check-subscription-status-auth-less";

export const checkFeaturesAccessAuthLess = async (userId: string, beforeRecord?: boolean) => {
  const { rows } = await conn.execute(
    `SELECT u.createdAt as userCreatedAt, u.email as email,
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
    };
  }

  const { isSubscribed, subscriptionId } =
    await checkSubscriptionStatusAuthLess(userData.email);

  const totalClicks = userData.totalUserClicks || 0;
  const daysSinceRegistration = userData.userCreatedAt
    ? Math.floor(
        (Date.now() - new Date(userData.userCreatedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const maxClicks = beforeRecord ? 29 : 30;

  const isTrialOver = totalClicks >= maxClicks || daysSinceRegistration >= 10;

  return {
    featuresAccess: isSubscribed || !isTrialOver,
    isTrialOver,
    isSubscribed,
    subscriptionNotPaid: !!subscriptionId && !isSubscribed,
  };
};
