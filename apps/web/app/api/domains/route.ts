import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { createLink, transformLink } from "@/lib/api/links";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  DomainSchema,
  createDomainBodySchema,
  getDomainsQuerySchemaExtended,
} from "@/lib/zod/schemas/domains";
import { DEFAULT_LINK_PROPS, nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/domains – get all domains for a workspace
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { search, archived, page, pageSize, includeLink } =
      getDomainsQuerySchemaExtended.parse(searchParams);

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
        ...(includeLink && {
          links: {
            where: {
              key: "_root",
            },
            include: {
              tags: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        }),
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const response = domains.map((domain) => ({
      ...DomainSchema.parse(domain),
      ...(includeLink &&
        domain.links.length > 0 && {
          link: transformLink({
            ...domain.links[0],
            tags: domain.links[0]["tags"].map((tag) => tag),
          }),
        }),
    }));

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);

// POST /api/domains - add a domain
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const body = await parseRequestBody(req);
    const { slug, placeholder, expiredUrl, notFoundUrl, logo } =
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

    const domainId = createId({ prefix: "dom_" });

    const logoUploaded =
      logo && workspace.plan !== "free"
        ? await storage.upload(`domains/${domainId}/logo_${nanoid(7)}`, logo)
        : null;

    const [domainRecord, _] = await Promise.all([
      prisma.domain.create({
        data: {
          id: domainId,
          slug: slug,
          projectId: workspace.id,
          primary: totalDomains === 0,
          ...(placeholder && { placeholder }),
          ...(workspace.plan !== "free" && {
            expiredUrl,
            notFoundUrl,
            ...(logoUploaded && { logo: logoUploaded.url }),
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

    return NextResponse.json(
      DomainSchema.parse({
        ...domainRecord,
        registeredDomain: null,
      }),
      {
        status: 201,
      },
    );
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
