import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { logger } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { IdempotencyKey, IdempotencyStatus, Prisma } from "@prisma/client";

// Pending: short lock while the handler runs.
const DEFAULT_PENDING_TTL_SECONDS = 60; // 1 minute
// Completed: how long we replay the cached response.
const DEFAULT_COMPLETED_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type IdempotencyResult<T> = {
  responseStatus: number;
  responseBody: T;
};

type WithIdempotencyParams<T> = {
  namespace: string;
  workspaceId: string;
  key: string | null | undefined;
  fingerprint: string;
  pendingTtlSeconds?: number;
  completedTtlSeconds?: number;
  fn: () => Promise<IdempotencyResult<T>>;
};

type ClaimResult =
  | { claimed: true }
  | { claimed: false; existing: IdempotencyKey };

export async function withIdempotency<T>({
  namespace,
  workspaceId,
  key,
  fingerprint,
  pendingTtlSeconds = DEFAULT_PENDING_TTL_SECONDS,
  completedTtlSeconds = DEFAULT_COMPLETED_TTL_SECONDS,
  fn,
}: WithIdempotencyParams<T>): Promise<IdempotencyResult<T>> {
  if (!key) {
    return fn();
  }

  const claim = await claimIdempotencyKey({
    namespace,
    workspaceId,
    key,
    fingerprint,
    pendingTtlSeconds,
  });

  if (!claim.claimed) {
    const { existing } = claim;

    // If the idempotency key record is completed and the fingerprint match, return the cached response
    if (
      existing.status === IdempotencyStatus.completed &&
      existing.fingerprint === fingerprint &&
      existing.responseStatus != null &&
      existing.responseBody != null &&
      existing.expiresAt > new Date()
    ) {
      logger.info("idempotency.replayed", {
        namespace,
        workspaceId,
      });

      return {
        responseStatus: existing.responseStatus,
        responseBody: existing.responseBody as T,
      };
    }

    // If the idempotency key record is in progress, return a 409 error
    if (existing.status === IdempotencyStatus.inProgress) {
      logger.info("idempotency.in_progress", {
        namespace,
        workspaceId,
      });

      throw new DubApiError({
        code: "conflict",
        message: "A request with this idempotency key is already in progress.",
      });
    }

    // If the fingerprint doesn't match a previous request, return a 409 error
    logger.info("idempotency.fingerprint_mismatch", {
      namespace,
      workspaceId,
    });

    throw new DubApiError({
      code: "conflict",
      message:
        "A request with this idempotency key was already processed with a different body.",
    });
  }

  try {
    const result = await fn();

    await prisma.idempotencyKey.update({
      where: {
        namespace_workspaceId_idempotencyKey: {
          namespace,
          workspaceId,
          idempotencyKey: key,
        },
      },
      data: {
        status: IdempotencyStatus.completed,
        responseStatus: result.responseStatus,
        responseBody: result.responseBody as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + completedTtlSeconds * 1000),
      },
    });

    return result;
  } catch (error) {
    await prisma.idempotencyKey
      .delete({
        where: {
          namespace_workspaceId_idempotencyKey: {
            namespace,
            workspaceId,
            idempotencyKey: key,
          },
        },
      })
      .catch(() => null);

    throw error;
  }
}

// Claims via unique (namespace, workspaceId, idempotencyKey): the first create wins;
// concurrent duplicates hit P2002 and do not run the handler.
async function claimIdempotencyKey({
  namespace,
  workspaceId,
  key,
  fingerprint,
  pendingTtlSeconds,
}: {
  namespace: string;
  workspaceId: string;
  key: string;
  fingerprint: string;
  pendingTtlSeconds: number;
}): Promise<ClaimResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.idempotencyKey.create({
        data: {
          id: createId({ prefix: "idem_" }),
          namespace,
          workspaceId,
          idempotencyKey: key,
          fingerprint,
          status: IdempotencyStatus.inProgress,
          expiresAt: new Date(Date.now() + pendingTtlSeconds * 1000),
        },
      });

      logger.info("idempotency.claimed", {
        namespace,
        workspaceId,
      });

      return {
        claimed: true,
      };
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
      ) {
        throw error;
      }

      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          namespace_workspaceId_idempotencyKey: {
            namespace,
            workspaceId,
            idempotencyKey: key,
          },
        },
      });

      // Row vanished between P2002 and this read (deleted on failure, expiry reclaim, or cron)
      if (!existing) {
        continue;
      }

      if (existing.expiresAt <= new Date()) {
        await prisma.idempotencyKey.deleteMany({
          where: {
            id: {
              in: [existing.id],
            },
          },
        });

        logger.info("idempotency.expired_reclaimed", {
          namespace,
          workspaceId,
        });

        continue;
      }

      return {
        claimed: false,
        existing,
      };
    }
  }

  throw new DubApiError({
    code: "conflict",
    message: "A request with this idempotency key is already in progress.",
  });
}

async function deleteIdempotencyKey(where: Prisma.IdempotencyKeyWhereInput) {
  await prisma.idempotencyKey.deleteMany({
    where,
  });
}
