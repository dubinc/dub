import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { isAllowedSyncUXOrigin } from "@/lib/domain-connect/allowed-origins";
import {
  DEFAULT_DC_SERVICE_EMAIL,
  DOMAIN_CONNECT_KEY_HOST,
} from "@/lib/domain-connect/constants";
import { discoverDomainConnect } from "@/lib/domain-connect/discover";
import { mapResendRecordsToEmailDomainConnectParams } from "@/lib/domain-connect/map-email-domain-records";
import { buildSignedApplyUrl } from "@/lib/domain-connect/sign-apply-url";
import { resend } from "@dub/email/resend";
import { APP_DOMAIN, getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  returnTo: z.string().max(512).optional(),
});

// POST /api/email-domains/[domain]/domain-connect/apply
export const POST = withWorkspace(
  async ({ req, workspace, params }) => {
    const privateKeyPem =
      process.env.DOMAIN_CONNECT_PRIVATE_KEY?.trim().replace(/\\n/g, "\n") ||
      null;

    if (!privateKeyPem) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Domain Connect signing is not configured.",
      });
    }

    if (!resend) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Resend is not configured.",
      });
    }

    const programId = getDefaultProgramIdOrThrow(workspace);
    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain: params.domain,
    });

    if (!emailDomain.resendDomainId) {
      throw new DubApiError({
        code: "not_found",
        message: "Resend domain ID is not found for this domain.",
      });
    }

    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const domainResponse = await resend.domains.get(emailDomain.resendDomainId);
    if (domainResponse.error || !domainResponse.data) {
      throw new DubApiError({
        code: "internal_server_error",
        message:
          domainResponse.error?.message ||
          "Could not retrieve DNS records for this email domain.",
      });
    }

    if (domainResponse.data.status === "verified") {
      throw new DubApiError({
        code: "bad_request",
        message: "This email domain is already verified.",
      });
    }

    const apex = getApexDomain(`https://${emailDomain.slug}`);
    const discovery = await discoverDomainConnect(apex);
    if (!discovery) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Auto configure is only available for Vercel or Cloudflare DNS zones.",
      });
    }

    if (!isAllowedSyncUXOrigin(discovery.urlSyncUX)) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid Domain Connect provider URL.",
      });
    }

    const mapped = mapResendRecordsToEmailDomainConnectParams({
      records: domainResponse.data.records ?? [],
      emailSlug: emailDomain.slug,
      apex,
    });

    if (!mapped) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Could not build DNS auto-configure parameters from this domain's records. Try again or configure manually.",
      });
    }

    const returnPath =
      body.returnTo &&
      body.returnTo.startsWith(`/${workspace.slug}/`) &&
      !body.returnTo.includes("://")
        ? body.returnTo
        : `/${workspace.slug}/settings/domains/email`;

    const redirectUrl = new URL(returnPath, APP_DOMAIN);
    redirectUrl.searchParams.set("domain_connect", "callback");
    const redirectUri = redirectUrl.toString();

    const queryParams: Record<string, string> = {
      domain: apex,
      groupId: mapped.groupId,
      redirect_uri: redirectUri,
      mxHost: mapped.mxHost,
      mxValue: mapped.mxValue,
      spfTxtHost: mapped.spfTxtHost,
      spfTxtValue: mapped.spfTxtValue,
      dkimSelector: mapped.dkimSelector,
      dkimTxtValue: mapped.dkimTxtValue,
    };

    if (mapped.host) {
      queryParams.host = mapped.host;
    }

    if (mapped.dkim2Selector && mapped.dkim2TxtValue) {
      queryParams.dkim2Selector = mapped.dkim2Selector;
      queryParams.dkim2TxtValue = mapped.dkim2TxtValue;
    }

    const applyUrl = buildSignedApplyUrl({
      urlSyncUX: discovery.urlSyncUX,
      serviceId: DEFAULT_DC_SERVICE_EMAIL,
      privateKeyPem,
      keyHost: DOMAIN_CONNECT_KEY_HOST,
      queryParams,
    });

    return NextResponse.json({ applyUrl });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.write"],
  },
);
