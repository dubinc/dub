import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DomainSchema,
  createDomainBodySchema,
  getDomainsQuerySchema,
} from "@/lib/zod/schemas/domains";
import { DEFAULT_LINK_PROPS, getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/domains – get all domains for a workspace
export const GET = withWorkspace(
  async ({ req, workspace }) => {
    const searchParams = getSearchParams(req.url);
    const { search, archived, page, pageSize } =
      getDomainsQuerySchema.parse(searchParams);

    const domains = await prisma.domain.findMany({
      where: {
        projectId: workspace.id,
        archived,
        ...(search && {
          slug: {
            contains: search,
          },
        }),
      },
      include: {
        registeredDomain: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return NextResponse.json(z.array(DomainSchema).parse(domains));
  },
  {
    requiredPermissions: ["domains.read"],
  },
);

// POST /api/domains - add a domain
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const body = await parseRequestBody(req);
    const { slug, placeholder, expiredUrl } =
      createDomainBodySchema.parse(body);

    const totalDomains = await prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    });

    if (totalDomains >= workspace.domainsLimit) {
      return new Response(
        exceededLimitError({
          plan: workspace.plan,
          limit: workspace.domainsLimit,
          type: "domains",
        }),
        { status: 403 },
      );
    }

    if (workspace.plan === "free" && expiredUrl) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only use Default Expiration URLs on a Pro plan and above. Upgrade to Pro to use these features.",
      });
    }

    const validDomain = await validateDomain(slug);

    if (validDomain.error && validDomain.code) {
      throw new DubApiError({
        code: validDomain.code,
        message: validDomain.error,
      });
    }

    const vercelResponse = await addDomainToVercel(slug);

    if (
      vercelResponse.error &&
      vercelResponse.error.code !== "domain_already_in_use" // ignore this error
    ) {
      return new Response(vercelResponse.error.message, { status: 422 });
    }

    const [domainRecord, _] = await Promise.all([
      prisma.domain.create({
        data: {
          slug: slug,
          projectId: workspace.id,
          primary: totalDomains === 0,
          ...(placeholder && { placeholder }),
          ...(workspace.plan !== "free" && {
            expiredUrl,
          }),
        },
      }),
      createLink({
        ...DEFAULT_LINK_PROPS,
        domain: slug,
        key: "_root",
        url: "",
        tags: undefined,
        userId: session.user.id,
        projectId: workspace.id,
      }),
    ]);

    return NextResponse.json(DomainSchema.parse(domainRecord), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
