import { postbackEventSchemaTB } from "@/lib/postback/schemas";
import { tb } from "./client";
import * as z from "zod/v4";

export const getPartnerPostbackEvents = tb.buildPipe({
  pipe: "get_partner_postback_events",
  parameters: z.object({
    postbackId: z.string(),
  }),
  data: postbackEventSchemaTB,
});
