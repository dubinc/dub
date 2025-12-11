import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
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
  const paidWorkspaces = user.projects.map((project) => project);
  // for free users, need to do some extra checks
  if (!paidWorkspaces || paidWorkspaces.length === 0) {
    // if the free user has a partner account, they are only eligible if they can view the program marketplace
    const programEnrollments = user.partners[0]?.partner.programs;
    if (
      programEnrollments &&
      !partnerCanViewMarketplace({
        partner: user.partners[0]?.partner,
        programEnrollments,
      })
    ) {
      return NextResponse.json({ publicToken: null });
    }

    // for regular free users, don't allow them to join the referral program if they've just joined (within the last 30 days)
    if (user.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
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
