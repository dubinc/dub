import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/primary – set a domain as primary
export const POST = withWorkspace(
  async ({ headers, workspace, params }) => {
    const { slug: domain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    const [domainRecord] = await Promise.all([
      prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          primary: true,
        },
        include: {
          registeredDomain: true,
        },
      }),

      // Set all other domains as not primary
      prisma.domain.updateMany({
        where: {
          projectId: workspace.id,
          primary: true,
          slug: {
            not: domain,
          },
        },
        data: {
          primary: false,
        },
      }),
    ]);

    return NextResponse.json(transformDomain(domainRecord), { headers });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
