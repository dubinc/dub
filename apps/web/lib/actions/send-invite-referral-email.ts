"use server";

import { sendEmail } from "@dub/email";
import ReferralInvite from "@dub/email/templates/referral-invite";
import * as z from "zod/v4";
import { assertRateLimit } from "../upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "../upstash/ratelimit-policies";
import { emailSchema } from "../zod/schemas/auth";
import { authActionClient } from "./safe-action";

// send invite referral email for Dub Referrals (soon to be deprecated?)
export const sendInviteReferralEmail = authActionClient
  .inputSchema(
    z.object({
      workspaceId: z.string(),
      email: emailSchema,
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { email } = parsedInput;

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.inviteReferralEmailWorkspace,
      identifier: workspace.id,
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.inviteReferralEmailTarget,
      identifier: email,
    });

    try {
      return await sendEmail({
        subject: "You've been invited to start using Dub",
        to: email,
        react: ReferralInvite({
          email,
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
