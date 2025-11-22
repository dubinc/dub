import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createHash } from "crypto";

// Normalize email for comparison
export function normalizeEmail(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Strip plus addressing for all domains
  const plusIndex = username.indexOf("+");
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "gmail.com" || domain === "googlemail.com") {
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

export function createFraudEventGroupKey({
  programId,
  partnerId,
  type,
  batchId,
}: {
  programId: string;
  partnerId: string;
  type: FraudRuleType;
  batchId?: string;
}): string {
  const parts = [programId, partnerId, type, batchId].map((part) =>
    part?.toLowerCase(),
  );

  return createHash("sha256")
    .update(parts.join("|"))
    .digest("base64url")
    .slice(0, 24);
}

// Resolve the fraud events
export async function resolveFraudEvents({
  where,
  userId,
  resolutionReason,
}: {
  where: Prisma.FraudEventWhereInput;
  userId: string;
  resolutionReason?: string;
}) {
  // Fetch pending fraud events matching the where clause
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      ...where,
      status: "pending",
    },
    select: {
      id: true,
      groupKey: true,
      partnerId: true,
      type: true,
      programId: true,
    },
  });

  if (fraudEvents.length === 0) {
    return;
  }

  // Group events by their existing groupKey
  const groupedEvents = fraudEvents.reduce((acc, event) => {
    if (!acc.has(event.groupKey)) {
      acc.set(event.groupKey, []);
    }

    acc.get(event.groupKey)!.push(event);

    return acc;
  }, new Map<string, typeof fraudEvents>());

  // Update each group with a new groupKey and mark as resolved
  for (const [groupKey, events] of groupedEvents) {
    if (events.length === 0) continue;

    const firstEvent = events[0];
    const newGroupKey = createFraudEventGroupKey({
      programId: firstEvent.programId,
      partnerId: firstEvent.partnerId,
      type: firstEvent.type,
      batchId: nanoid(10),
    });

    await prisma.fraudEvent.updateMany({
      where: {
        groupKey,
        status: "pending",
      },
      data: {
        status: "resolved",
        userId,
        resolvedAt: new Date(),
        resolutionReason,
        groupKey: newGroupKey,
      },
    });
  }

  return fraudEvents;
}
