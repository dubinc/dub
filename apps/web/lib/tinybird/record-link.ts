import z from "@/lib/zod";
import { tb } from "./client";

export const recordLink = tb.buildIngestEndpoint({
  datasource: "dub_links_metadata",
  event: z.object({
    timestamp: z.string().default(new Date().toISOString()),
    link_id: z.string(),
    domain: z.string(),
    key: z.string(),
    url: z.string().default(""),
    tagIds: z.array(z.string()).default([]),
    project_id: z.string().nullish().default(""),
    deleted: z.boolean().default(false),
  }),
  wait: true,
});
