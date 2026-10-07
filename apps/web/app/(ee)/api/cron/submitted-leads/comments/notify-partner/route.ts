import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadCommentsToNotify } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import { getCompanyLogoUrl } from "@/ui/submitted-leads/submitted-lead-utils";
import { sendBatchEmail } from "@dub/email";
import NewSubmittedLeadCommentsFromProgram from "@dub/email/templates/new-submitted-lead-comments-from-program";
import { log } from "@dub/utils";
import { subDays } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  leadId: z.string(),
  lastCommentId: z.string(),
  lastCommentCreatedAt: z.coerce.date(),
});

// POST /api/cron/submitted-leads/comments/notify-partner
// Notify a partner about new comments from the program on their submitted lead
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { leadId, lastCommentId, lastCommentCreatedAt } = schema.parse(
      JSON.parse(rawBody),
    );

    const lead = await prisma.submittedLead.findUniqueOrThrow({
      where: {
        id: leadId,
      },
      include: {
        program: true,
        partner: {
          include: {
            users: {
              where: {
                notificationPreferences: {
                  newMessageFromProgram: true,
                },
              },
              include: {
                user: true,
              },
            },
          },
        },
        comments: {
          where: {
            partnerId: null, // not written by the partner
            partnerVisible: true,
            notifiedAt: null,
            createdAt: {
              gt: subDays(new Date(), 3),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: true,
          },
        },
      },
    });

    const comments = getSubmittedLeadCommentsToNotify({
      unsentComments: lead.comments,
      lastCommentCreatedAt,
    });

    if (!comments)
      return logAndRespond(
        `There is an unsent comment newer than ${lastCommentId}. Skipping...`,
      );

    if (comments.length === 0)
      return logAndRespond(
        `No unsent comments found on lead ${leadId}. Skipping...`,
      );

    const partnerUsersToNotify = lead.partner.users
      .map(({ user }) => user)
      .filter(({ email }) => Boolean(email)) as { email: string }[];

    const { program } = lead;

    if (partnerUsersToNotify.length > 0) {
      const { error } = await sendBatchEmail(
        partnerUsersToNotify.map(({ email }) => ({
          subject: `${program.name} sent ${comments.length === 1 ? "a comment" : `${comments.length} comments`} for your submitted lead`,
          variant: "notifications",
          to: email,
          replyTo: program.supportEmail || "noreply",
          react: NewSubmittedLeadCommentsFromProgram({
            program: {
              name: program.name,
              slug: program.slug,
              logo: program.logo,
            },
            lead: {
              id: lead.id,
              name: lead.name,
              email: lead.email,
              image: getCompanyLogoUrl(lead.email),
            },
            comments: comments.map((comment) => ({
              text: comment.text,
              createdAt: comment.createdAt,
              user: comment.user.name
                ? {
                    name: comment.user.name,
                    image: comment.user.image,
                  }
                : {
                    name: program.name,
                    image: program.logo,
                  },
            })),
            email,
          }),
        })),
        {
          idempotencyKey: `submitted-lead-comments-partner/${lastCommentId}`,
        },
      );

      if (error)
        throw new Error(
          `Error sending comment emails to partner ${lead.partnerId}: ${error.message}`,
        );
    }

    await prisma.submittedLeadComment.updateMany({
      where: {
        id: {
          in: comments.map(({ id }) => id),
        },
        notifiedAt: null,
      },
      data: {
        notifiedAt: new Date(),
      },
    });

    return logAndRespond(
      partnerUsersToNotify.length > 0
        ? `Emails sent for comments on lead ${leadId} to partner ${lead.partnerId}.`
        : `No partner emails to notify for partner ${lead.partnerId}. Marked the comments as handled.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying partner of new submitted lead comments: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
