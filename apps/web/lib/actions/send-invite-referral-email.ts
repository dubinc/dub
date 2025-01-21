"use server";

import { sendEmail } from "@dub/email";
import { ReferralInvite } from "@dub/email/templates/referral-invite";
import { z } from "zod";
import { ratelimit } from "../upstash";
import { emailSchema } from "../zod/schemas/auth";
import { authActionClient } from "./safe-action";

// send invite referral email for Dub Referrals (soon to be deprecated?)
export const sendInviteReferralEmail = authActionClient
  .schema(
    z.object({
      workspaceId: z.string(),
      email: emailSchema,
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { email } = parsedInput;

    // Allow 5 emails / workspace / minute
    const { success: successWorkspace } = await ratelimit(5, "1 m").limit(
      `invite-referral-email:${workspace.id}`,
    );

    // Allow 2 emails to a specific address / 2 hours (not one / hour to allow one quick retry)
    const { success: successEmail } = await ratelimit(2, "2 h").limit(
      `invite-referral-email:${email}`,
    );

    if (!successWorkspace || !successEmail)
      throw new Error("Failed to send: rate limit exceeded");

    try {
      return await sendEmail({
        subject: `You've been invited to start using ${process.env.NEXT_PUBLIC_APP_NAME}`,
        email,
        react: ReferralInvite({
          email,
          appName: process.env.NEXT_PUBLIC_APP_NAME as string,
          url: `https://refer.dub.co/${workspace.slug}`,
          workspaceUser: ctx.user.name || null,
          workspaceUserEmail: ctx.user.email || null,
        }),
      });
    } catch (e) {
      console.error("Failed to send invitation email", e);
    }

    throw new Error("Failed to send invitation email");
  });
