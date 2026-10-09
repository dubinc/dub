import { logger } from "@/lib/axiom/server";
import { storage } from "@/lib/storage";
import { decideQuarantine } from "@/lib/storage/magic-bytes";
import * as z from "zod/v4";

const CREATE_ACTIONS = new Set([
  "PutObject",
  "CopyObject",
  "CompleteMultipartUpload",
]);

export const r2ObjectCreatedNotificationSchema = z
  .object({
    account: z.string().optional(),
    action: z.string(),
    bucket: z.string().optional(),
    object: z
      .object({
        key: z.string().optional(),
        size: z.number().optional(),
        eTag: z.string().optional(),
      })
      .optional(),
    eventTime: z.string().optional(),
  })
  .passthrough();

type R2ObjectCreatedNotification = z.infer<
  typeof r2ObjectCreatedNotificationSchema
>;

type ProcessR2ObjectCreatedResult =
  | { status: "skipped"; reason: string; key?: string }
  | { status: "allowed"; reason: string; key: string }
  | {
      status: "removed";
      reason: string;
      key: string;
      contentType: string | null;
      detectedMime: string | null;
    };

// Validate magic bytes for an R2 object-create notification; delete on mismatch
export async function processR2ObjectCreated(
  notification: R2ObjectCreatedNotification,
): Promise<ProcessR2ObjectCreatedResult> {
  const key = notification.object?.key;
  const action = notification.action;

  if (!key) {
    return {
      status: "skipped",
      reason: "missing_key",
    };
  }

  if (action && !CREATE_ACTIONS.has(action)) {
    return {
      status: "skipped",
      reason: "non_create_action",
      key,
    };
  }

  const head = await storage.head({ key, bucket: "public" });
  if (!head) {
    return {
      status: "skipped",
      reason: "object_not_found",
      key,
    };
  }

  const bytes = await storage.getBytes({
    key,
    bucket: "public",
    length: 4100,
  });

  if (!bytes) {
    return {
      status: "skipped",
      reason: "object_not_found",
      key,
    };
  }

  const decision = decideQuarantine({
    key,
    contentType: head.contentType,
    bytes,
  });

  if (decision.action === "skip") {
    return {
      status: "skipped",
      reason: decision.reason,
      key,
    };
  }

  if (decision.action === "allow") {
    return {
      status: "allowed",
      reason: decision.reason,
      key,
    };
  }

  await storage.delete({
    key,
    bucket: "public",
  });

  logger.warn("storage.r2_magic_bytes_mismatch", {
    key,
    contentType: decision.contentType,
    detectedMime: decision.detectedMime,
    reason: decision.reason,
    action,
    size: notification.object?.size ?? head.contentLength,
    eTag: notification.object?.eTag ?? head.eTag,
  });

  await logger.flush();

  return {
    status: "removed",
    reason: decision.reason,
    key,
    contentType: decision.contentType,
    detectedMime: decision.detectedMime,
  };
}
