import { conn } from "@/lib/planetscale/connection";

export async function checkTrialOver(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { rows } = await conn.execute(
    `SELECT u.createdAt as userCreatedAt,
      (SELECT SUM(clicks) FROM Link l WHERE l.userId = u.id) as totalUserClicks
     FROM User u 
     WHERE u.id = ?`,
    [userId],
  );

  const userData = rows?.[0];
  console.log("userData", userData);
  if (!userData) {
    return false;
  }

  const totalClicks = userData.totalUserClicks || 0;
  const daysSinceRegistration = userData.userCreatedAt
    ? Math.floor(
        (Date.now() - new Date(userData.userCreatedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return totalClicks > 30 || daysSinceRegistration > 10;
}
