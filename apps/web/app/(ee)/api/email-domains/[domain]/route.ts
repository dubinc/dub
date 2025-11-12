import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  EmailDomainSchema,
  updateEmailDomainBodySchema,
} from "@/lib/zod/schemas/email-domains";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/email-domains/[domain] - update an email domain
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { slug } = updateEmailDomainBodySchema.parse(
      await parseRequestBody(req),
    );

    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain,
    });

    const domainChanged = slug && slug !== emailDomain.slug;

    let resendDomainId: string | undefined;

    if (domainChanged) {
      if (!resend) {
        throw new DubApiError({
          code: "internal_server_error",
          message: "Resend is not configured.",
        });
      }

      if (emailDomain.resendDomainId) {
        await resend.domains.remove(emailDomain.resendDomainId);
      }

      const { data: resendDomain, error } = await resend.domains.create({
        name: slug,
      });

      if (error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: error.message,
        });
      }

      resendDomainId = resendDomain.id;

      waitUntil(
        (async () => {
          // Moving the updates to Qstash because updating the domain immediately after creation can fail.
          const response = await qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/email-domains/update`,
            method: "POST",
            delay: 1 * 60, // 1 minute delay
            body: {
              domainId: emailDomain.id,
            },
          });

          if (!response.messageId) {
            console.error(
              `Failed to queue email domain update for domain ${emailDomain.id}`,
              response,
            );
          } else {
            console.log(
              `Queued email domain update for domain ${emailDomain.id}`,
              response,
            );
          }
        })(),
      );
    }

    try {
      const updatedEmailDomain = await prisma.emailDomain.update({
        where: {
          id: emailDomain.id,
        },
        data: {
          slug,
          ...(domainChanged && {
            resendDomainId,
            status: "pending",
          }),
        },
      });

      return NextResponse.json(EmailDomainSchema.parse(updatedEmailDomain));
    } catch (error) {
      console.error(error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new DubApiError({
            code: "conflict",
            message: `This ${slug} domain has been registered already by another program.`,
          });
        }
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.write"],
  },
);

// DELETE /api/email-domains/[domain] - delete an email domain
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain,
    });

    // Check if any active campaigns use this domain
    const activeCampaignsCount = await prisma.campaign.count({
      where: {
        programId,
        status: {
          in: ["active", "scheduled", "sending"],
        },
        from: {
          endsWith: `@${emailDomain.slug}`,
        },
      },
    });

    if (activeCampaignsCount > 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `There are active campaigns using this email domain. You can not delete it until all campaigns are completed or paused.`,
      });
    }

    await prisma.emailDomain.delete({
      where: {
        id: emailDomain.id,
      },
    });

    if (emailDomain.resendDomainId && resend) {
      await resend.domains.remove(emailDomain.resendDomainId);
    }

    return NextResponse.json({ id: emailDomain.id });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.write"],
  },
);
