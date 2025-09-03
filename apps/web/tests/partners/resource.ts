import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import z from "@/lib/zod";
import { expect } from "vitest";
import {
  E2E_PARTNER,
  E2E_PROGRAM,
  E2E_USER_ID,
  E2E_WORKSPACE_ID,
} from "../utils/resource";
import { expectedLink } from "../utils/schema";

export const partnerLink = {
  ...expectedLink,
  trackConversion: true,
  projectId: normalizeWorkspaceId(E2E_WORKSPACE_ID),
  workspaceId: E2E_WORKSPACE_ID,
  userId: E2E_USER_ID,
  domain: E2E_PROGRAM.domain,
  url: E2E_PROGRAM.url,
  programId: E2E_PROGRAM.id,
  partnerId: E2E_PARTNER.id,
  tenantId: E2E_PARTNER.tenantId,
  folderId: expect.any(String),
  qrCode: expect.any(String),
};

export const normalizedPartnerDateFields = z.object({
  createdAt: z.string(),
  payoutsEnabledAt: z.string().nullish(),
  websiteVerifiedAt: z.string().nullish(),
  youtubeVerifiedAt: z.string().nullish(),
  twitterVerifiedAt: z.string().nullish(),
  linkedinVerifiedAt: z.string().nullish(),
  instagramVerifiedAt: z.string().nullish(),
  tiktokVerifiedAt: z.string().nullish(),
});
