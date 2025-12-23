import { z } from "zod";
import { ExpandedLink } from "../api/links";
import { decodeKeyIfCaseSensitive } from "../api/links/case-sensitivity";
import { tb } from "./client";

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
  partner_group_id: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
  partner_tag_ids: z.array(z.string()).default([]),
  workspace_id: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
  created_at: z
    .date()
    .transform((v) => v.toISOString().replace("T", " ").replace("Z", "")),
  deleted: z
    .boolean()
    .default(false)
    .transform((v) => (v ? 1 : 0)),
});

const recordLinkTB = tb.buildIngestEndpoint({
  datasource: "dub_links_metadata",
  event: dubLinksMetadataSchema,
  wait: true,
});

const transformLinkTB = (link: ExpandedLink) => {
  const key = decodeKeyIfCaseSensitive({
    domain: link.domain,
    key: link.key,
  });

  return {
    link_id: link.id,
    domain: link.domain,
    key,
    url: link.url,
    tag_ids: link.tags?.map(({ tag }) => tag.id) ?? [],
    folder_id: link.folderId ?? "",
    tenant_id: link.tenantId ?? "",
    program_id: link.programId ?? "",
    partner_id: link.partnerId ?? "",
    partner_group_id: link.programEnrollment?.groupId ?? "",
    partner_tag_ids: [],
    workspace_id: link.projectId,
    created_at: link.createdAt,
  };
};

export const recordLink = async (
  payload: ExpandedLink | ExpandedLink[],
  { deleted }: { deleted?: boolean } = {},
) => {
  if (Array.isArray(payload)) {
    return await recordLinkTB(
      payload.map(transformLinkTB).map((p) => ({ ...p, deleted })),
    );
  } else {
    return await recordLinkTB({ ...transformLinkTB(payload), deleted });
  }
};
