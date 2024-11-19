import { createId, parseRequestBody } from "@/lib/api/utils";
import { requestPartnerInviteSchema } from "@/lib/dots/schemas";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/referrals/auth";
import { recordLink } from "@/lib/tinybird";
import { sendEmail } from "emails";
import PartnerInvite from "emails/partner-invite";
import { NextResponse } from "next/server";

// GET /api/referrals/invite - check if a partner is already invited to a program
export const GET = withAuth(async ({ link, program }) => {
  const [programEnrollment, programInvite] = await Promise.all([
    prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        linkId: link.id,
      },
    }),

    prisma.programInvite.findFirst({
      where: {
        programId: program.id,
        linkId: link.id,
      },
    }),
  ]);

  return NextResponse.json({
    programEnrollment,
    programInvite,
  });
});

// POST /api/referrals/invite - invite a partner to dub partners
export const POST = withAuth(async ({ req, link, program, workspace }) => {
  // TODO:
  // We're repating the same logic in the invite-partner action.
  // We should move it to a shared location if it makes sense.

  const { email } = requestPartnerInviteSchema.parse(
    await parseRequestBody(req),
  );

  const [programEnrollment, programInvite, tags] = await Promise.all([
    prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        partner: {
          users: {
            some: {
              user: {
                email,
              },
            },
          },
        },
      },
    }),

    prisma.programInvite.findUnique({
      where: {
        email_programId: {
          email,
          programId: program.id,
        },
      },
    }),

    prisma.tag.findMany({
      where: {
        links: {
          some: {
            linkId: link.id,
          },
        },
      },
    }),
  ]);

  if (programEnrollment) {
    throw new Error("You're already enrolled in this program.");
  }

  if (programInvite) {
    throw new Error("You've already been invited to this program.");
  }

  const [programInvited] = await Promise.all([
    prisma.programInvite.create({
      data: {
        id: createId({ prefix: "pgi_" }),
        email,
        linkId: link.id,
        programId: program.id,
      },
    }),

    updateConfig({
      key: "partnersPortal",
      value: email,
    }),

    recordLink({
      domain: link.domain,
      key: link.key,
      link_id: link.id,
      created_at: link.createdAt,
      url: link.url,
      tag_ids: tags.map((t) => t.id) || [],
      program_id: program.id,
      workspace_id: workspace.id,
      deleted: false,
    }),

    sendEmail({
      subject: `${program.name} invited you to join Dub Partners`,
      email,
      react: PartnerInvite({
        email,
        appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
        program: {
          name: program.name,
          logo: program.logo,
        },
      }),
    }),
  ]);

  return NextResponse.json(programInvited);
});
