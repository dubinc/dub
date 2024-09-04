import { Session, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, WorkspaceWithUsers } from "@/lib/types";
import { TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { randomBytes } from "crypto";
import { sendEmail } from "emails";
import WorkspaceInvite from "emails/workspace-invite";
import { DubApiError } from "./errors";

export async function inviteUser({
  email,
  role = "member",
  workspace,
  session,
}: {
  email: string;
  role?: Role;
  workspace: WorkspaceWithUsers;
  session?: Session;
}) {
  // same method of generating a token as next-auth
  const token = randomBytes(32).toString("hex");
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
        message: "User has already been invited to this workspace.",
      });
    }
  }

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: await hashToken(token, { secret: true }),
      expires,
    },
  });

  const params = new URLSearchParams({
    callbackUrl: `${process.env.NEXTAUTH_URL}/${workspace.slug}?invite=true`,
    email,
    token,
  });

  const url = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?${params}`;

  return await sendEmail({
    subject: `You've been invited to join a workspace on ${process.env.NEXT_PUBLIC_APP_NAME}`,
    email,
    react: WorkspaceInvite({
      email,
      appName: process.env.NEXT_PUBLIC_APP_NAME as string,
      url,
      workspaceName: workspace.name,
      workspaceUser: session?.user.name || null,
      workspaceUserEmail: session?.user.email || null,
    }),
  });
}
