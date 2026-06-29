import { logger } from "@/lib/axiom/server";
import { clickWebhookWorkspaces } from "@/lib/webhook/click-webhook-workspaces";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import * as z from "zod/v4";
import { redis } from "../redis";
import { RedisStream } from "./client";

const STREAM_KEY = "workspace:click:events";

export const workspaceClickEventStream = new RedisStream(STREAM_KEY);

export const publishWorkspaceClickEvent = async (
  event: z.infer<typeof clickEventSchemaTB>,
) => {
  const { workspace_id: workspaceId } = event;

  const hasWebhooks = await clickWebhookWorkspaces.has(workspaceId);

  if (!hasWebhooks) {
    return;
  }

  try {
    return await redis.xadd(STREAM_KEY, "*", event);
  } catch (error) {
    logger.error("stream.publish_failed", {
      service: "upstash",
      streamKey: STREAM_KEY,
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
      correlation: {
        workspaceId: event.workspace_id,
        clickId: event.click_id,
        linkId: event.link_id,
      },
    });

    await logger.flush();
    throw error;
  }
};
