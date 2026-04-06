/**
 * E2E helpers for the **monthly partner program summary** cron pipeline:
 * `GET /api/cron/partner-program-summary` → `POST /api/cron/partner-program-summary/process`.
 *
 * - **GET** — Lists the same `ProgramEnrollment` cohort the process route loads first (before Tinybird + email).
 * - **POST** — Seeds or updates partners so they match (or opt out of) that cohort.
 * - **DELETE** — Removes partners created by this POST (teardown only).
 *
 * @see ../../cron/partner-program-summary/process/route.ts
 */
import { DubApiError } from "@/lib/api/errors";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerProgramSummaryCohortWhere } from "../../cron/partner-program-summary/partner-program-summary-cohort-where";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { assertE2EWorkspace } from "../guard";

const postBodySchema = z.object({
  partnerId: z.string().optional(),
  monthlyProgramSummary: z.boolean().optional().default(true),
  ensureMinLeads: z.coerce.number().int().min(1).optional().default(1),
});

const E2E_PARTNER_EMAIL_SUFFIX = "@e2e.test";
const E2E_PARTNER_EMAIL_PREFIX = "e2e.partner-program-summary.";
const E2E_DELETABLE_PARTNER_ID_RE = /^pn_[A-Za-z0-9]+$/;

function assertDeletableE2ePartnerId(partnerId: string) {
  const id = partnerId.trim();
  if (!id || id.length > 64 || !E2E_DELETABLE_PARTNER_ID_RE.test(id)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Invalid partnerId for E2E teardown (expected a single Dub partner id from this endpoint’s POST).",
    });
  }
  return id;
}

async function ensureLinkLeadsAtLeast(
  programId: string,
  partnerId: string,
  minLeads: number,
) {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { programId, partnerId, status: "approved" },
    select: {
      id: true,
      links: { select: { id: true, leads: true }, take: 1 },
    },
  });

  if (!enrollment) {
    throw new DubApiError({
      code: "not_found",
      message: `No approved ProgramEnrollment for partnerId=${partnerId} and program.`,
    });
  }

  const link = enrollment.links[0];
  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: `Enrollment ${enrollment.id} has no links.`,
    });
  }

  if (link.leads < minLeads) {
    await prisma.link.update({
      where: { id: link.id },
      data: { leads: minLeads },
    });
  }

  return {
    enrollmentId: enrollment.id,
    linkId: link.id,
  };
}

// GET /api/e2e/partner-program-summary?programId=&partnerId=
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  assertE2EWorkspace(workspace);

  const programId =
    searchParams.programId || getDefaultProgramIdOrThrow(workspace);

  const where = partnerProgramSummaryCohortWhere(programId);

  const [count, rows] = await Promise.all([
    prisma.programEnrollment.count({ where }),
    prisma.programEnrollment.findMany({
      where,
      take: 20,
      select: {
        partnerId: true,
      },
    }),
  ]);

  const partnerIds = rows.map((r) => r.partnerId);

  const payload: {
    programId: string;
    count: number;
    partnerIds: string[];
    eligible?: boolean;
  } = {
    programId,
    count,
    partnerIds,
  };

  if (searchParams.partnerId) {
    payload.eligible = partnerIds.includes(searchParams.partnerId);
  }

  return NextResponse.json(payload);
});

// POST /api/e2e/partner-program-summary — create E2E partner or update prefs (same workspace token as workflows E2E helpers).
export const POST = withWorkspace(async ({ req, workspace }) => {
  assertE2EWorkspace(workspace);

  const programId = getDefaultProgramIdOrThrow(workspace);
  const {
    partnerId: existingPartnerId,
    monthlyProgramSummary,
    ensureMinLeads,
  } = postBodySchema.parse(await req.json());

  if (existingPartnerId) {
    const partnerUser = await prisma.partnerUser.findFirst({
      where: { partnerId: existingPartnerId },
      select: {
        id: true,
        notificationPreferences: { select: { id: true } },
      },
    });

    if (!partnerUser) {
      throw new DubApiError({
        code: "not_found",
        message: `No PartnerUser found for partnerId=${existingPartnerId}.`,
      });
    }

    if (partnerUser.notificationPreferences) {
      await prisma.partnerNotificationPreferences.update({
        where: { partnerUserId: partnerUser.id },
        data: { monthlyProgramSummary },
      });
    } else {
      await prisma.partnerNotificationPreferences.create({
        data: {
          partnerUserId: partnerUser.id,
          monthlyProgramSummary,
        },
      });
    }

    const { enrollmentId, linkId } = await ensureLinkLeadsAtLeast(
      programId,
      existingPartnerId,
      ensureMinLeads,
    );

    return NextResponse.json({
      programId,
      partnerId: existingPartnerId,
      enrollmentId,
      linkId,
    });
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      defaultFolderId: true,
      defaultGroupId: true,
    },
  });

  if (!program?.defaultGroupId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Program has no default group; cannot create E2E partner.",
    });
  }

  const projectUser = await prisma.projectUsers.findFirst({
    where: { projectId: workspace.id },
    select: { userId: true },
  });

  if (!projectUser) {
    throw new DubApiError({
      code: "not_found",
      message: "No workspace member found to attach PartnerUser.",
    });
  }

  const email = `e2e.partner-program-summary.${nanoid(12)}${E2E_PARTNER_EMAIL_SUFFIX}`;

  const enrolled = await createAndEnrollPartner({
    workspace: {
      id: workspace.id,
      plan: workspace.plan,
      webhookEnabled: workspace.webhookEnabled,
    },
    program: {
      id: program.id,
      defaultFolderId: program.defaultFolderId,
      defaultGroupId: program.defaultGroupId,
    },
    partner: {
      email,
      name: "E2E partner program summary",
    },
    userId: projectUser.userId,
    skipEnrollmentCheck: true,
  });

  if ((enrolled.links ?? []).length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Partner was enrolled but no default links were created; check program default group links.",
    });
  }

  await prisma.partnerUser.create({
    data: {
      partnerId: enrolled.id,
      userId: projectUser.userId,
      role: "owner",
      notificationPreferences: {
        create: {
          monthlyProgramSummary,
        },
      },
    },
  });

  const { enrollmentId, linkId } = await ensureLinkLeadsAtLeast(
    programId,
    enrolled.id,
    ensureMinLeads,
  );

  return NextResponse.json({
    programId,
    partnerId: enrolled.id,
    enrollmentId,
    linkId,
  });
});

// DELETE /api/e2e/partner-program-summary?partnerId=
// Deletes at most one partner row and its scoped children. Guardrails: id shape + email prefix from POST only.
export const DELETE = withWorkspace(async ({ workspace, searchParams }) => {
  assertE2EWorkspace(workspace);

  const rawPartnerId = searchParams.partnerId;
  if (!rawPartnerId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Missing partnerId query parameter.",
    });
  }

  const partnerId = assertDeletableE2ePartnerId(rawPartnerId);

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { email: true },
  });

  const email = partner?.email ?? "";
  if (
    !email.startsWith(E2E_PARTNER_EMAIL_PREFIX) ||
    !email.endsWith(E2E_PARTNER_EMAIL_SUFFIX)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "Only partners created by POST on this route (e2e.partner-program-summary.*@e2e.test) can be deleted.",
    });
  }

  const programId = getDefaultProgramIdOrThrow(workspace);
  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: { partnerId, programId },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner is not enrolled in the workspace default program.",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.link.deleteMany({ where: { partnerId } });
    await tx.programEnrollment.deleteMany({ where: { partnerId } });
    await tx.partnerInvite.deleteMany({ where: { partnerId } });
    await tx.partnerUser.deleteMany({ where: { partnerId } });
    await tx.$executeRaw(
      Prisma.sql`DELETE FROM \`Partner\` WHERE \`id\` = ${partnerId}`,
    );
  });

  return NextResponse.json({ deleted: true, partnerId });
});
