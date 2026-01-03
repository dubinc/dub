import * as z from "zod/v4";
import { ClickEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { tb } from "./client";

const getClickEventTB = tb.buildPipe({
  pipe: "get_click_event",
  parameters: z.object({
    clickId: z.string(),
  }),
  data: clickEventSchemaTB,
});

export const getClickEvent = async ({ clickId }: { clickId: string }) => {
  // check Redis cache first
  const cachedClickData = await redis.get<ClickEventTB>(
    `clickIdCache:${clickId}`,
  );

  if (cachedClickData) {
    return {
      ...cachedClickData,
      timestamp: cachedClickData.timestamp.replace("T", " ").replace("Z", ""),
      qr: cachedClickData.qr ? 1 : 0,
      bot: cachedClickData.bot ? 1 : 0,
    };
  }

  try {
    // fallback to Tinybird if Redis cache is not found
    const { data } = await getClickEventTB({ clickId });
    return data[0];
  } catch (error) {
    console.error(
      `[getClickEvent] Error getting click event for clickId: ${clickId}`,
      error,
    );
    return null;
  }
};
