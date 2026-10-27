import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import {
  partnerHasEarnedCommissions,
  partnerIsNotBanned,
  type ProgramEnrollmentsForDiscoverability,
} from "@/lib/network/get-network-approval-requirements";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      createdAt: true,
      partners: {
        select: {
          partnerId: true,
        },
        take: 1,
      },
      projects: {
        where: {
          project: {
            plan: {
              not: "free",
            },
          },
        },
        select: {
          projectId: true,
        },
        take: 1,
      },
    },
  });

  // for free users, need to do some extra checks
  if (user.projects.length === 0) {
    // for partners with free workspaces, they are only eligible if they have a good reputation
    // Read the enrollments by partnerId, not through the partner relation, so a partner user whose partner was deleted does not throw.
    const partnerId = user.partners[0]?.partnerId;
    const programEnrollments: ProgramEnrollmentsForDiscoverability = partnerId
      ? await prisma.programEnrollment.findMany({
          where: {
            partnerId,
          },
          select: {
            programId: true,
            status: true,
            totalCommissions: true,
          },
        })
      : [];

    if (
      programEnrollments.length > 0 &&
      !(
        partnerHasEarnedCommissions(programEnrollments) &&
        partnerIsNotBanned(programEnrollments)
      )
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
