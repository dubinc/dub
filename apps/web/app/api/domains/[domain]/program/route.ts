import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { updateProgramDomain } from "@/lib/api/domains/update-program-domain";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/program – set a domain as the program domain
export const POST = withWorkspace(
  async ({ headers, workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const domainRecord = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    if (domainRecord.archived) {
      throw new DubApiError({
        code: "bad_request",
        message: "You cannot set an archived domain as the program domain.",
      });
    }

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        domain: true,
      },
    });

    if (program.domain === domainRecord.slug) {
      throw new DubApiError({
        code: "bad_request",
        message: "This domain is already the program domain.",
      });
    }

    await updateProgramDomain({
      programId,
      oldDomain: program.domain,
      newDomain: domainRecord.slug,
    });

    return NextResponse.json(transformDomain(domainRecord), { headers });
  },
  {
    requiredPermissions: ["domains.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
