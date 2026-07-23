import { getConfigResponse } from "@/lib/api/domains/get-config-response";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  DEFAULT_DC_SERVICE_APEX,
  DEFAULT_DC_SERVICE_SUBDOMAIN,
  DOMAIN_CONNECT_KEY_HOST,
} from "@/lib/domain-connect/constants";
import { discoverDomainConnect } from "@/lib/domain-connect/discover";
import { buildSignedApplyUrl } from "@/lib/domain-connect/sign-apply-url";
import { APP_DOMAIN, getApexDomain, getSubdomain } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  recordType: z.enum(["A", "CNAME"]),
  returnTo: z.string().max(512).optional(),
});

// POST /api/domains/[domain]/domain-connect/apply
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

    const { slug: domain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    const body = bodySchema.parse(await req.json());

    const [domainJson, configJson] = await Promise.all([
      getDomainResponse(domain),
      getConfigResponse(domain),
    ]);

    if (domainJson?.error?.code === "not_found" || domainJson?.error) {
      throw new DubApiError({
        code: "bad_request",
        message: "Domain is not available for configuration.",
      });
    }

    if (configJson?.conflicts?.length) {
      throw new DubApiError({
        code: "bad_request",
        message: "Remove conflicting DNS records first, then retry.",
      });
    }

    if (domainJson.verified && !configJson.misconfigured) {
      throw new DubApiError({
        code: "bad_request",
        message: "This domain is already configured correctly.",
      });
    }

    const apex = getApexDomain(`https://${domain}`);
    const discovery = await discoverDomainConnect(apex);
    if (!discovery) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Auto configure is only available for Vercel or Cloudflare DNS zones.",
      });
    }

    const allowedSyncUXOrigins = [
      "https://vercel.com",
      "https://dash.cloudflare.com",
    ];
    const syncUXOrigin = new URL(discovery.urlSyncUX).origin;
    if (!allowedSyncUXOrigins.includes(syncUXOrigin)) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid Domain Connect provider URL.",
      });
    }

    const subdomain = getSubdomain(
      domainJson.name?.toLowerCase() ?? domain,
      domainJson.apexName?.toLowerCase() ?? apex,
    );
    const isApex = body.recordType === "A" || !subdomain;
    const serviceId = isApex
      ? DEFAULT_DC_SERVICE_APEX
      : DEFAULT_DC_SERVICE_SUBDOMAIN;

    const returnPath =
      body.returnTo &&
      body.returnTo.startsWith(`/${workspace.slug}/`) &&
      !body.returnTo.includes("://")
        ? body.returnTo
        : `/${workspace.slug}/settings/domains`;

    const redirectUrl = new URL(returnPath, APP_DOMAIN);
    redirectUrl.searchParams.set("domain_connect", "callback");
    const redirectUri = redirectUrl.toString();

    const queryParams: Record<string, string> = {
      domain: apex,
      groupId: "subdomain",
      redirect_uri: redirectUri,
    };

    if (isApex) {
      queryParams.groupId = "apex";
    } else {
      queryParams.groupId = "subdomain";
      queryParams.host = (subdomain ?? "www").toLowerCase();
    }

    const txtVerification = domainJson.verification?.find(
      (x: { type: string }) => x.type === "TXT",
    );
    if (txtVerification) {
      queryParams.groupId = queryParams.groupId + ",verification";
      const txtHostFqdn: string = txtVerification.domain?.toLowerCase() ?? "";
      const apexSuffix = `.${apex}`;
      const txtHost = txtHostFqdn.endsWith(apexSuffix)
        ? txtHostFqdn.slice(0, -apexSuffix.length)
        : txtHostFqdn === apex
          ? "@"
          : txtHostFqdn;
      queryParams.txtHost = txtHost;
      queryParams.txtValue = txtVerification.value ?? "";
    }

    const applyUrl = buildSignedApplyUrl({
      urlSyncUX: discovery.urlSyncUX,
      serviceId,
      privateKeyPem,
      keyHost: DOMAIN_CONNECT_KEY_HOST,
      queryParams,
    });

    return NextResponse.json({ applyUrl });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
