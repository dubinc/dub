import z from "@/lib/zod";
import { waitUntil } from "@vercel/functions";
import { ExpandedLink } from "../api/links";
import { decodeKeyIfCaseSensitive } from "../api/links/case-sensitivity";
import { prefixWorkspaceId } from "../api/workspaces/workspace-id";
import { tb, tbNew } from "./client";

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

// TODO: Remove after Tinybird migration
export const recordLinkTBNew = tbNew.buildIngestEndpoint({
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

export const recordLink = async (
  payload: ExpandedLink | ExpandedLink[],
  { deleted }: { deleted?: boolean } = {},
) => {
  if (Array.isArray(payload)) {
    waitUntil(
      recordLinkTBNew(
        payload.map(transformLinkTB).map((p) => ({ ...p, deleted })),
      ),
    );
    return await recordLinkTB(
      payload.map(transformLinkTB).map((p) => ({ ...p, deleted })),
    );
  } else {
    waitUntil(recordLinkTBNew({ ...transformLinkTB(payload), deleted }));
    return await recordLinkTB({ ...transformLinkTB(payload), deleted });
  }
};
