import { Session, hashToken } from "#/lib/auth";
import prisma from "#/lib/prisma";
import { sendEmail } from "emails";
import { randomBytes } from "crypto";
import ProjectInvite from "emails/project-invite";
import { ProjectProps } from "#/lib/types";

export async function inviteUser({
  email,
  project,
  session,
}: {
  email: string;
  project: ProjectProps;
  session?: Session;
}) {
  // same method of generating a token as next-auth
  const token = randomBytes(32).toString("hex");
  const TWO_WEEKS_IN_SECONDS = 60 * 60 * 24 * 14;
  const expires = new Date(Date.now() + TWO_WEEKS_IN_SECONDS * 1000);

  // create a project invite record and a verification request token that lasts for a week
  // here we use a try catch to account for the case where the user has already been invited
  // for which `prisma.projectInvite.create()` will throw a unique constraint error
  try {
    await prisma.projectInvite.create({
      data: {
        email,
        expires,
        projectId: project.id,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("User has already been invited to this project");
    }
  }

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires,
    },
  });

  const params = new URLSearchParams({
    callbackUrl: `${process.env.NEXTAUTH_URL}/${project.slug}`,
    email,
    token,
  });

  const url = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?${params}`;

  return await sendEmail({
    subject: "You've been invited to join a project on Dub",
    email,
    react: ProjectInvite({
      email,
      url,
      projectName: project.name,
      projectUser: session?.user.name || null,
      projectUserEmail: session?.user.email || null,
    }),
  });
}
