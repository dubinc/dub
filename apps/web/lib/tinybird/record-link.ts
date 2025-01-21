import z from "@/lib/zod";
import { ExpandedLink } from "../api/links";
import { tb } from "./client";

export const dubLinksMetadataSchema = z.object({
  link_id: z.string(),
  domain: z.string(),
  key: z.string(),
  url: z.string().default(""),
  tag_ids: z.array(z.string()).default([]),
  tenant_id: z
    .string()
    .nullable()
    .transform((v) => (v === null ? "" : v)),
  program_id: z.string().default(""),
  workspace_id: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return ""; // return empty string if null or undefined
      if (!v.startsWith("ws_")) {
        return `ws_${v}`;
      } else {
        return v;
      }
    }),
  folder_id: z.string().default(""),
  created_at: z
    .date()
    .transform((v) => v.toISOString().replace("T", " ").replace("Z", "")),
  deleted: z
    .boolean()
    .default(false)
    .transform((v) => (v ? 1 : 0)),
});

export const recordLinkTB = tb.buildIngestEndpoint({
  datasource: "dub_links_metadata",
  event: dubLinksMetadataSchema,
  wait: true,
});

export const transformLinkTB = (link: ExpandedLink) => {
  return {
    link_id: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    tag_ids: link.tags?.map(({ tag }) => tag.id),
    tenant_id: link.tenantId ?? "",
    program_id: link.programId ?? "",
    workspace_id: link.projectId,
    created_at: link.createdAt,
  };
};

export const recordLink = async (payload: ExpandedLink | ExpandedLink[]) => {
  if (Array.isArray(payload)) {
    return await recordLinkTB(payload.map(transformLinkTB));
  } else {
    return await recordLinkTB(transformLinkTB(payload));
  }
};
