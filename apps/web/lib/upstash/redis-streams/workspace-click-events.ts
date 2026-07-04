import { logger } from "@/lib/axiom/server";
import { clickWebhookWorkspaces } from "@/lib/webhook/click-webhook-workspaces";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { redis } from "../redis";
import { RedisStream } from "./client";

const STREAM_KEY = "workspace:click:events";

export const workspaceClickEventStream = new RedisStream(STREAM_KEY);

export const publishWorkspaceClickEvent = async (event) => {
  try {
    const parsedEvent = clickEventSchemaTB.parse({
      ...event,
      qr: Number(event.qr),
      bot: Number(event.bot),
    });

    const hasLinkClickedWebhooks = await clickWebhookWorkspaces.has(
      parsedEvent.workspace_id,
    );

    if (!hasLinkClickedWebhooks) {
      return;
    }

    return await redis.xadd(STREAM_KEY, "*", parsedEvent);
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
