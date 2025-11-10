import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  EmailDomainSchema,
  updateEmailDomainBodySchema,
} from "@/lib/zod/schemas/email-domains";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
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
          // Verify an existing domain
          const { error: resendVerifyError } = await resend.domains.verify(
            resendDomain.id,
          );

          if (resendVerifyError) {
            console.error(
              `Resend domain verify failed - ${resendVerifyError.message}`,
            );
          }

          // Enable open tracking for the domain
          const { error: resendUpdateError } = await resend.domains.update({
            id: resendDomain.id,
            openTracking: true,
            clickTracking: false,
            tls: "opportunistic",
          });

          if (resendUpdateError) {
            console.error(
              `Resend domain update failed - ${resendUpdateError.message}`,
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
