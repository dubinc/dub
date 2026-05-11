import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  DUB_CUSTOM_DOMAIN_A_RECORD,
  DUB_CUSTOM_DOMAIN_CNAME,
} from "@/lib/domain-connect/constants";
import { ratelimit } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import DomainDnsInstructions from "@dub/email/templates/domain-dns-instructions";
import { getApexDomain, getSubdomain } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  email: z.email(),
  recordType: z.enum(["A", "CNAME"]),
});

// POST /api/domains/[domain]/forward-instructions
export const POST = withWorkspace(
  async ({ req, workspace, params, session }) => {
    const { slug: domain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    const { email, recordType } = bodySchema.parse(await req.json());

    const { success } = await ratelimit(10, "1 h").limit(
      `forward-dns-instructions:${workspace.id}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }

    const records: { type: string; name: string; value: string }[] = [];

    const domainJson = await getDomainResponse(domain);

    if (domainJson?.error) {
      throw new DubApiError({
        code: "bad_request",
        message: "Could not retrieve DNS records for this domain.",
      });
    }

    const apex = getApexDomain(`https://${domain}`);
    const subdomain = getSubdomain(
      domainJson.name?.toLowerCase() ?? domain,
      domainJson.apexName?.toLowerCase() ?? apex,
    );

    if (recordType === "A") {
      records.push({
        type: "A",
        name: subdomain ?? "@",
        value: DUB_CUSTOM_DOMAIN_A_RECORD,
      });
    } else {
      records.push({
        type: "CNAME",
        name: subdomain ?? "www",
        value: DUB_CUSTOM_DOMAIN_CNAME,
      });
    }

    const txtVerification = domainJson.verification?.find(
      (x: { type: string }) => x.type === "TXT",
    );
    if (txtVerification) {
      const txtHostFqdn: string = txtVerification.domain?.toLowerCase() ?? "";
      const apexSuffix = `.${apex}`;
      const txtHost = txtHostFqdn.endsWith(apexSuffix)
        ? txtHostFqdn.slice(0, -apexSuffix.length)
        : txtHostFqdn === apex
          ? "@"
          : txtHostFqdn;
      const txtValue = txtVerification.value?.trim() ?? "";
      if ((txtHost || txtHost === "@") && txtValue) {
        records.push({ type: "TXT", name: txtHost, value: txtValue });
      }
    }

    await sendEmail({
      subject: `DNS instructions for ${domain}`,
      to: email,
      react: DomainDnsInstructions({
        email,
        domain,
        records,
        senderEmail: session.user.email,
      }),
    });

    return NextResponse.json({ ok: true });
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
