import { createLink } from "@/lib/api/links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// POST /api/e2e/partners/links - Create a link for a partner (E2E only, when group has no default links)
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId is required" },
        { status: 400 },
      );
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        domain: true,
        url: true,
        defaultFolderId: true,
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 },
      );
    }

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: { partnerId, programId },
      },
      include: { partner: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Partner not found in program" },
        { status: 404 },
      );
    }

    // Find a domain: prefer program domain, else first workspace domain
    let domain = program.domain;
    if (!domain) {
      const wsDomain = await prisma.domain.findFirst({
        where: { projectId: workspace.id },
        select: { slug: true },
      });
      domain = wsDomain?.slug ?? null;
    }
    if (!domain) {
      return NextResponse.json(
        { error: "No domain available for link creation" },
        { status: 400 },
      );
    }

    const url = program.url || "https://example.com";
    const key = `e2e-${nanoid(7)}`;

    const { processLink } = await import("@/lib/api/links/process-link");
    const result = await processLink({
      workspace: {
        id: (workspace as { id: string }).id,
        plan: (workspace as { plan: string }).plan,
        users: [{ role: "owner" }],
      },
      userId: session.user.id,
      payload: {
        domain,
        key,
        url,
        trackConversion: true,
        programId: program.id,
        partnerId: enrollment.partnerId,
        tenantId: enrollment.tenantId,
        folderId: program.defaultFolderId,
        projectId: (workspace as { id: string }).id,
      },
      skipProgramChecks: true,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    const link = await createLink(result.link);
    return NextResponse.json(
      { domain: link.domain, key: link.key },
      { status: 201 },
    );
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
