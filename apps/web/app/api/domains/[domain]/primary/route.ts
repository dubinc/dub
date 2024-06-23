import { getDomainOrThrow } from "@/lib/api/domains/get-domain";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DomainSchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/primary – set a domain as primary
export const POST = withWorkspace(
  async ({ headers, workspace, params }) => {
    const { slug: domain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      domainChecks: true,
    });

    const [domainRecord] = await Promise.all([
      prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          primary: true,
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

    return NextResponse.json(DomainSchema.parse(domainRecord), { headers });
  },
  {
    requiredRole: ["owner"],
  },
);
