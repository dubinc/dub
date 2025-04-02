import z from "@/lib/zod";
import { ExpandedLink } from "../api/links";
import { decodeKeyIfCaseSensitive } from "../api/links/case-sensitivity";
import { prefixWorkspaceId } from "../api/workspace-id";
import { tb } from "./client";

// Domains that are not recorded in Tinybird
export const DOMAINS_TO_SKIP = ["buff.ly"];

export const dubLinksMetadataSchema = z.object({
  link_id: z.string(),
  domain: z.string(),
  key: z.string(),
  url: z.string().default(""),
  tag_ids: z.array(z.string()).default([]),
  folder_id: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
  tenant_id: z
    .string()
    .nullable()
    .transform((v) => (v ? v : "")),
  program_id: z
    .string()
    .nullable()
    .transform((v) => (v ? v : "")),
  partner_id: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
  workspace_id: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return ""; // return empty string if null or undefined

      return prefixWorkspaceId(v);
    }),
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
  const key = decodeKeyIfCaseSensitive({
    domain: link.domain,
    key: link.key,
  });

  return {
    link_id: link.id,
    domain: link.domain,
    key,
    url: link.url,
    tag_ids: link.tags?.map(({ tag }) => tag.id),
    folder_id: link.folderId ?? "",
    tenant_id: link.tenantId ?? "",
    program_id: link.programId ?? "",
    partner_id: link.partnerId ?? "",
    workspace_id: link.projectId,
    created_at: link.createdAt,
  };
};

export const recordLink = async (payload: ExpandedLink | ExpandedLink[]) => {
  if (Array.isArray(payload)) {
    const tbPayload = payload.filter(
      (link) => !DOMAINS_TO_SKIP.includes(link.domain),
    );

    if (!tbPayload.length) {
      return;
    }

    return await recordLinkTB(tbPayload.map(transformLinkTB));
  } else {
    if (DOMAINS_TO_SKIP.includes(payload.domain)) {
      return;
    }

    return await recordLinkTB(transformLinkTB(payload));
  }
};
