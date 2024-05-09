import z from "../zod";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { tb } from "./client";

export const getClickEvent = tb.buildPipe({
  pipe: "get_click_event",
  parameters: z.object({
    clickId: z.string(),
  }),
  data: clickEventSchemaTB,
});
