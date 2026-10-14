import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 100;

export async function deleteExpiredSessions(cutoff: Date = new Date()) {
  let deleted = 0;

  while (true) {
    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          lt: cutoff,
        },
      },
      select: {
        id: true,
      },
      take: BATCH_SIZE,
    });

    if (sessions.length === 0) {
      break;
    }

    const { count } = await prisma.session.deleteMany({
      where: {
        id: {
          in: sessions.map(({ id }) => id),
        },
      },
    });

    deleted += count;
    console.log(`Deleted ${count} expired sessions`);

    if (sessions.length < BATCH_SIZE) {
      break;
    }
  }

  return deleted;
}

export async function deleteExpiredVerifications(cutoff: Date = new Date()) {
  let deleted = 0;

  while (true) {
    const verifications = await prisma.verification.findMany({
      where: {
        expiresAt: {
          lt: cutoff,
        },
      },
      select: {
        id: true,
      },
      take: BATCH_SIZE,
    });

    if (verifications.length === 0) {
      break;
    }

    const { count } = await prisma.verification.deleteMany({
      where: {
        id: {
          in: verifications.map(({ id }) => id),
        },
      },
    });

    deleted += count;
    console.log(`Deleted ${count} expired verifications`);

    if (verifications.length < BATCH_SIZE) {
      break;
    }
  }

  return deleted;
}
