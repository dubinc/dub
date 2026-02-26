import { createId } from "@/lib/api/create-id";
import { createPartnerDefaultLinks } from "@/lib/api/partners/create-partner-default-links";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../guard";

// POST /api/e2e/partners - Create a partner for E2E testing (minimal setup, optionally with default links)
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();
    const { name, email, groupId } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      select: {
        id: true,
        defaultGroupId: true,
        defaultFolderId: true,
        domain: true,
        url: true,
      },
    });

    const finalGroupId = groupId || program.defaultGroupId;
    if (!finalGroupId) {
      return NextResponse.json(
        { error: "No group ID and program has no default group" },
        { status: 400 },
      );
    }

    const group = await getGroupOrThrow({
      programId,
      groupId: finalGroupId,
      includeExpandedFields: true,
    });

    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId,
        partner: { email },
      },
      include: { partner: true, links: true },
    });

    if (existingEnrollment) {
      const enrolledPartner = {
        ...existingEnrollment.partner,
        ...existingEnrollment,
        id: existingEnrollment.partner.id,
        links: existingEnrollment.links ?? [],
      };
      return NextResponse.json(enrolledPartner, { status: 201 });
    }

    let partner = await prisma.partner.findUnique({
      where: { email },
      include: {
        programs: { where: { programId } },
      },
    });

    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          id: createId({ prefix: "pn_" }),
          name: name || email,
          email,
          programs: {
            create: {
              id: createId({ prefix: "pge_" }),
              programId,
              status: "approved",
              groupId: group.id,
              clickRewardId: group.clickRewardId,
              leadRewardId: group.leadRewardId,
              saleRewardId: group.saleRewardId,
              discountId: group.discountId,
            },
          },
        },
        include: {
          programs: { where: { programId } },
        },
      });
    } else {
      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          programId,
          partnerId: partner.id,
          status: "approved",
          groupId: group.id,
          clickRewardId: group.clickRewardId,
          leadRewardId: group.leadRewardId,
          saleRewardId: group.saleRewardId,
          discountId: group.discountId,
        },
      });
      partner = await prisma.partner.findUniqueOrThrow({
        where: { id: partner.id },
        include: {
          programs: { where: { programId } },
        },
      });
    }

    const enrollment = partner!.programs[0];
    if (!enrollment) {
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 500 },
      );
    }

    let links: { domain: string; key: string }[] = [];
    const ws = workspace as {
      id: string;
      plan: "free" | "pro" | "business" | "advanced" | "enterprise";
    };
    const programWithFolder = program.defaultFolderId
      ? { id: program.id, defaultFolderId: program.defaultFolderId }
      : null;
    if (
      programWithFolder &&
      group.partnerGroupDefaultLinks &&
      group.partnerGroupDefaultLinks.length > 0
    ) {
      try {
        const enrollmentData = partner!.programs[0];
        const createdLinks = await createPartnerDefaultLinks({
          workspace: { id: ws.id, plan: ws.plan },
          program: programWithFolder,
          partner: {
            id: partner!.id,
            name: partner!.name ?? "",
            email: partner!.email ?? "",
            username: undefined,
            tenantId: enrollmentData?.tenantId ?? undefined,
          },
          group: {
            defaultLinks: group.partnerGroupDefaultLinks,
            utmTemplate: group.utmTemplate ?? null,
          },
          userId: session.user.id,
        });
        links = createdLinks.map((l) => ({ domain: l.domain, key: l.key }));
      } catch {
        // If link creation fails (e.g. domain config), fall through to fallback
      }
    }
    // Fallback: create a link using program domain/url when group has no default links (e.g. CI)
    if (links.length === 0 && program.domain && program.url && programWithFolder) {
      try {
        const { generatePartnerLink } = await import(
          "@/lib/api/partners/generate-partner-link"
        );
        const { bulkCreateLinks } = await import("@/lib/api/links");
        const [createdLink] = await bulkCreateLinks({
          links: [
            await generatePartnerLink({
              workspace: { id: ws.id, plan: ws.plan },
              program: programWithFolder,
              partner: {
                id: partner!.id,
                name: partner!.name ?? "",
                email: partner!.email ?? "",
                username: undefined,
                tenantId: partner!.programs[0]?.tenantId ?? undefined,
              },
              link: {
                domain: program.domain,
                url: program.url,
              },
              userId: session.user.id,
            }),
          ],
          skipRedisCache: true,
        });
        if (createdLink) {
          links = [{ domain: createdLink.domain, key: createdLink.key }];
        }
      } catch {
        // If fallback fails, return partner without links
      }
    }

    const enrolledPartner = {
      ...partner,
      ...enrollment,
      id: partner!.id,
      links,
    };

    return NextResponse.json(enrolledPartner, { status: 201 });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
