import { postbackEventOutputSchemaTB } from "@/lib/postback/schemas";
import * as z from "zod/v4";
import { tb } from "../../tinybird/client";

export const getPostbackEvents = tb.buildPipe({
  pipe: "get_postback_events",
  parameters: z.object({
    postbackId: z.string(),
  }),
  data: postbackEventOutputSchemaTB,
});
