import { clickWebhookWorkspaces } from "@/lib/webhook/click-webhook-workspaces";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import * as z from "zod/v4";
import { redis } from "../redis";
import { RedisStream } from "./client";

const STREAM_KEY = "workspace:click:events";

export const clickEventStream = new RedisStream(STREAM_KEY);

export const publishClickEvent = async (
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
    throw error;

    // TODO
    // Log to Axiom
  }
};
