import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadCommentNotificationBatch } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
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

    const { leadId, lastCommentId } = schema.parse(JSON.parse(rawBody));

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
            createdAt: {
              gt: subDays(new Date(), 3),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
          include: {
            user: true,
          },
        },
      },
    });

    if (lead.comments.length === 0)
      return logAndRespond(
        `No comments found for the partner on lead ${leadId}. Skipping...`,
      );

    if (lead.comments[0].id !== lastCommentId)
      return logAndRespond(
        `There is a more recent comment than ${lastCommentId}. Skipping...`,
      );

    const partnerUsersToNotify = lead.partner.users
      .map(({ user }) => user)
      .filter(({ email }) => Boolean(email)) as { email: string }[];

    if (partnerUsersToNotify.length === 0)
      return logAndRespond(
        `No partner emails to notify for partner ${lead.partnerId}. Skipping...`,
      );

    const comments = getSubmittedLeadCommentNotificationBatch(lead.comments);
    const { program } = lead;

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

    return logAndRespond(
      `Emails sent for comments on lead ${leadId} to partner ${lead.partnerId}.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying partner of new submitted lead comments: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
