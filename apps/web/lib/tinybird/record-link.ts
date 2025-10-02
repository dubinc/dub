import z from "@/lib/zod";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import { ExpandedLink } from "../api/links";
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
  created_at: z
    .date()
    .transform((v) => v.toISOString().replace("T", " ").replace("Z", "")),
  deleted: z
    .boolean()
    .default(false)
    .transform((v) => (v ? 1 : 0)),
  qr_id: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
  qr_type: z
    .string()
    .nullish()
    .transform((v) => (v ? v : "")),
});

export const recordLinkTB = tb.buildIngestEndpoint({
  datasource: "dub_links_metadata",
  event: dubLinksMetadataSchema,
  wait: true,
});

export const transformLinkTB = (
  link: ExpandedLink,
  qrData?: { id?: string; qrType?: EQRType },
) => {
  return {
    link_id: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    tag_ids: link.tags?.map(({ tag }) => tag.id),
    folder_id: link.folderId ?? "",
    tenant_id: link.tenantId ?? "",
    program_id: link.programId ?? "",
    partner_id: link.partnerId ?? "",
    workspace_id: link.projectId,
    created_at: link.createdAt,
    qr_id: qrData?.id || "",
    qr_type: qrData?.qrType || "",
  };
};

export const recordLink = async (
  payload: ExpandedLink | ExpandedLink[],
  qrData?: { id?: string; qrType?: EQRType },
) => {
  if (Array.isArray(payload)) {
    return await recordLinkTB(
      payload.map((link) => transformLinkTB(link, qrData)),
    );
  } else {
    return await recordLinkTB(transformLinkTB(payload, qrData));
  }
};
