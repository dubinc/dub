import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadCommentNotificationBatch } from "@/lib/submitted-leads/submitted-lead-comment-notifications";
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

    const { leadId, lastCommentId } = schema.parse(JSON.parse(rawBody));

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
        `No comments from the partner found on lead ${leadId}. Skipping...`,
      );

    if (lead.comments[0].id !== lastCommentId)
      return logAndRespond(
        `There is a more recent comment than ${lastCommentId}. Skipping...`,
      );

    const { workspace } = lead.program;

    const usersToNotify = workspace.users
      .map(({ user }) => user)
      .filter(({ email, isMachine }) => email && !isMachine) as {
      email: string;
    }[];

    if (usersToNotify.length === 0)
      return logAndRespond(
        `No workspace emails to notify for lead ${leadId}. Skipping...`,
      );

    const comments = getSubmittedLeadCommentNotificationBatch(lead.comments);
    const { partner } = lead;

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
        tags: [{ name: "type", value: "notification-email" }],
      })),
    );

    if (error)
      throw new Error(
        `Error sending comment emails for lead ${leadId}: ${error.message}`,
      );

    return logAndRespond(
      `Emails sent for comments from partner ${partner.id} on lead ${leadId}.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying program of new submitted lead comments: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
