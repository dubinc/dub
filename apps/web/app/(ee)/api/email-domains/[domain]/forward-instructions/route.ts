import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { mapResendRecordsToForwardRows } from "@/lib/domain-connect/map-email-domain-records";
import { ratelimit } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import { resend } from "@dub/email/resend";
import DomainDnsInstructions from "@dub/email/templates/domain-dns-instructions";
import { getApexDomain } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  email: z.email(),
});

// POST /api/email-domains/[domain]/forward-instructions
export const POST = withWorkspace(
  async ({ req, workspace, params, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain: params.domain,
    });

    const { email } = bodySchema.parse(await req.json());

    const { success } = await ratelimit(10, "1 h").limit(
      `forward-email-dns-instructions:${workspace.id}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }

    if (!resend) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Resend is not configured.",
      });
    }

    if (!emailDomain.resendDomainId) {
      throw new DubApiError({
        code: "not_found",
        message: "Resend domain ID is not found for this domain.",
      });
    }

    const domainResponse = await resend.domains.get(emailDomain.resendDomainId);
    if (domainResponse.error || !domainResponse.data) {
      throw new DubApiError({
        code: "bad_request",
        message: "Could not retrieve DNS records for this email domain.",
      });
    }

    const apex = getApexDomain(`https://${emailDomain.slug}`);
    const resendRecords = domainResponse.data.records ?? [];

    if (resendRecords.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "No DNS records available to forward for this domain.",
      });
    }

    const records = mapResendRecordsToForwardRows({
      records: resendRecords,
      emailSlug: emailDomain.slug,
      apex,
    });

    await sendEmail({
      subject: `DNS instructions for ${emailDomain.slug}`,
      to: email,
      react: DomainDnsInstructions({
        email,
        domain: emailDomain.slug,
        records,
        senderEmail: session.user.email,
      }),
    });

    return NextResponse.json({ ok: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.read"],
  },
);
