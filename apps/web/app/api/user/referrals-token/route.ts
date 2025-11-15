import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { partnerCanViewMarketplace } from "@/lib/partners/get-discoverability-requirements";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  if (session.user.defaultPartnerId) {
    // if user has a partner account and no paid workspaces
    // check if they're eligible to view the program marketplace
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: session.user.id,
      },
      include: {
        partners: {
          include: {
            partner: {
              include: {
                programs: true,
              },
            },
          },
        },
        projects: {
          where: {
            project: {
              plan: {
                not: "free",
              },
            },
          },
        },
      },
    });
    const programEnrollments = user.partners[0]?.partner.programs;
    const paidWorkspaces = user.projects.map((project) => project);
    if (
      (!programEnrollments || !partnerCanViewMarketplace(programEnrollments)) &&
      (!paidWorkspaces || paidWorkspaces.length === 0)
    ) {
      return NextResponse.json({ publicToken: null });
    }
  }

  const { publicToken } = await dub.embedTokens.referrals({
    tenantId: session.user.id,
    partner: {
      name: session.user.name || session.user.email,
      email: session.user.email,
      image: session.user.image || null,
      tenantId: session.user.id,
      groupId: "grp_1K2QJWRQ917XX2YR5VHQ1RRC5", // User Referrals group
    },
  });

  return NextResponse.json({ publicToken });
});
