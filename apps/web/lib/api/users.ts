import { Session } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { sendEmail } from "@dub/email";
import WorkspaceInvite from "@dub/email/templates/workspace-invite";
import { APP_DOMAIN, TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { WorkspaceRole } from "@prisma/client";
import { buildLookupKey, buildMagicLinkUrl } from "../better-auth/utils";
import { createVerificationToken } from "../better-auth/verification-token";
import { DubApiError } from "./errors";

export async function inviteUser({
  email,
  role = "member",
  workspace,
  session,
}: {
  email: string;
  role?: WorkspaceRole;
  workspace: WorkspaceWithUsers;
  session?: Session;
}) {
  email = email.trim().toLowerCase();

  const expires = new Date(Date.now() + TWO_WEEKS_IN_SECONDS * 1000);

  // create a workspace invite record and a verification request token that lasts for a week
  // here we use a try catch to account for the case where the user has already been invited
  // for which `prisma.projectInvite.create()` will throw a unique constraint error
  try {
    await prisma.projectInvite.create({
      data: {
        email,
        role,
        expires,
        projectId: workspace.id,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new DubApiError({
        code: "conflict",
        message: `User ${email} has already been invited to this workspace.`,
      });
    }
  }

  const { token } = await createVerificationToken({
    kind: "invite",
    value: {
      email,
      isInvite: true,
    },
    lookupKey: buildLookupKey("invite", email, workspace.id),
    removePreviousTokens: true,
  });

  const url = buildMagicLinkUrl({
    token,
    origin: APP_DOMAIN,
    callbackURL: `${APP_DOMAIN}/${workspace.slug}/invite`,
  });

  return await sendEmail({
    subject: "You've been invited to join a workspace on Dub",
    to: email,
    react: WorkspaceInvite({
      email,
      url,
      workspaceName: workspace.name,
      workspaceUser: session?.user.name || null,
      workspaceUserEmail: session?.user.email || null,
    }),
  });
}
