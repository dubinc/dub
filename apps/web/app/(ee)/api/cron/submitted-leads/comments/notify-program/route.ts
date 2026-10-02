import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadCommentsToNotify } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
import { getCompanyLogoUrl } from "@/ui/submitted-leads/submitted-lead-utils";
import { sendBatchEmail } from "@dub/email";
import NewSubmittedLeadCommentsFromPartner from "@dub/email/templates/new-submitted-lead-comments-from-partner";
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

// POST /api/cron/submitted-leads/comments/notify-program
// Notify the program's workspace about new comments from the partner on a submitted lead
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
        partner: true,
        program: {
          include: {
            workspace: {
              include: {
                users: {
                  where: {
                    notificationPreference: {
                      newMessageFromPartner: true,
                    },
                  },
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        comments: {
          where: {
            partnerId: {
              not: null, // written by the partner
            },
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

    const { workspace } = lead.program;

    const usersToNotify = workspace.users
      .map(({ user }) => user)
      .filter(({ email, isMachine }) => email && !isMachine) as {
      email: string;
    }[];

    const { partner } = lead;

    if (usersToNotify.length > 0) {
      const { error } = await sendBatchEmail(
        usersToNotify.map(({ email }) => ({
          subject: `${comments.length} submitted lead ${comments.length === 1 ? "comment" : "comments"} from ${partner.name}`,
          variant: "notifications",
          to: email,
          react: NewSubmittedLeadCommentsFromPartner({
            workspace: {
              slug: workspace.slug,
            },
            partner: {
              id: partner.id,
              name: partner.name,
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
              user: {
                name: comment.user.name || partner.name,
                image: comment.user.image || partner.image,
              },
            })),
            email,
          }),
        })),
        {
          idempotencyKey: `submitted-lead-comments-program/${lastCommentId}`,
        },
      );

      if (error)
        throw new Error(
          `Error sending comment emails for lead ${leadId}: ${error.message}`,
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
      usersToNotify.length > 0
        ? `Emails sent for comments from partner ${partner.id} on lead ${leadId}.`
        : `No workspace emails to notify for lead ${leadId}. Marked the comments as handled.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying program of new submitted lead comments: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
