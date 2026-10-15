import { getNormalizedEmail } from "@/lib/email/normalize-email";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const EMAIL_BATCH_SIZE = 1000;

interface BackfillCustomerNormalizedEmailBatchInput {
  startingAfter?: string;
  dryRun?: boolean;
}

export async function backfillCustomerNormalizedEmailBatch({
  startingAfter,
  dryRun = false,
}: BackfillCustomerNormalizedEmailBatchInput) {
  const customers = await prisma.customer.findMany({
    where: {
      ...(startingAfter && {
        id: {
          gt: startingAfter,
        },
      }),
      email: {
        not: null,
      },
      normalizedEmail: null,
    },
    orderBy: {
      id: "asc",
    },
    take: EMAIL_BATCH_SIZE,
    select: {
      id: true,
      email: true,
    },
  });

  if (customers.length === 0) {
    return {
      customers,
      updates: [],
      updatedCount: 0,
      lastId: null,
      hasMore: false,
    };
  }

  // Skip customers whose email normalizes to null (e.g. empty string)
  // so we match what the write paths store via getNormalizedEmail
  const updates = customers
    .map(({ id, email }) => ({
      id,
      email,
      normalizedEmail: getNormalizedEmail(email),
    }))
    .filter(
      (u): u is { id: string; email: string; normalizedEmail: string } =>
        u.normalizedEmail !== null,
    );

  const lastId = customers[customers.length - 1].id;
  const hasMore = customers.length === EMAIL_BATCH_SIZE;

  if (dryRun || updates.length === 0) {
    return {
      customers,
      updates,
      updatedCount: 0,
      lastId,
      hasMore,
    };
  }

  const updatedCount = await prisma.$executeRaw`
    UPDATE Customer
    SET normalizedEmail = CASE id
      ${Prisma.join(
        updates.map((u) => Prisma.sql`WHEN ${u.id} THEN ${u.normalizedEmail}`),
        " ",
      )}
    END
    WHERE id IN (${Prisma.join(updates.map((u) => u.id))})
      AND normalizedEmail IS NULL
  `;

  return {
    customers,
    updates,
    updatedCount,
    lastId,
    hasMore,
  };
}
