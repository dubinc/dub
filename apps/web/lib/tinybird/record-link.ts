import z from "@/lib/zod";
import { tb } from "./client";

export const dubLinksMetadataSchema = z.object({
  link_id: z.string(),
  domain: z.string(),
  key: z.string(),
  url: z.string().default(""),
  tag_ids: z.array(z.string()).default([]),
  workspace_id: z
    .string()
    .nullish()
    .default("")
    .transform((v) => (v && !v.startsWith("ws_") ? `ws_${v}` : v)),
  created_at: z
    .date()
    .transform((v) => v.toISOString().replace("T", " ").replace("Z", "")),
  deleted: z
    .boolean()
    .default(false)
    .transform((v) => (v ? 1 : 0)),
});

export const recordLink = tb.buildIngestEndpoint({
  datasource: "dub_links_metadata_new",
  event: dubLinksMetadataSchema,
  wait: true,
});
