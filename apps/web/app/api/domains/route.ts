import { createId } from "@/lib/api/create-id";
import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { validateDomain } from "@/lib/api/domains/utils";
import { DubApiError } from "@/lib/api/errors";
import { createLink, transformLink } from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { isNonEmptyJson } from "@/lib/api/utils/is-non-empty-json";
import { withWorkspace } from "@/lib/auth";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { storage } from "@/lib/storage";
import {
  createDomainBodySchemaExtended,
  getDomainsQuerySchemaExtended,
} from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { Link, Prisma } from "@dub/prisma/client";
import { combineWords, DEFAULT_LINK_PROPS, nanoid } from "@dub/utils";
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
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const links = includeLink
      ? await prisma.link.findMany({
          where: {
            domain: {
              in: domains.map((domain) => domain.slug),
            },
            key: {
              in: ["_root", "akoJCU0="],
            },
          },
          include: {
            tags: {
              select: {
                tag: true,
              },
            },
          },
        })
      : [];

    const linkMap = links.reduce(
      (acc, link) => {
        acc[link.domain] = link;
        return acc;
      },
      {} as Record<string, Link>,
    );

    const response = domains.map((domain) => ({
      ...transformDomain(domain),
      ...(includeLink &&
        linkMap[domain.slug] && {
          link: transformLink({
            ...linkMap[domain.slug],
            tags: linkMap[domain.slug]["tags"].map((tag) => tag),
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
    const {
      slug,
      logo,
      expiredUrl,
      notFoundUrl,
      placeholder,
      assetLinks,
      appleAppSiteAssociation,
      deepviewData,
    } = await createDomainBodySchemaExtended.parseAsync(body);

    if (workspace.plan === "free") {
      if (
        logo ||
        expiredUrl ||
        notFoundUrl ||
        assetLinks ||
        appleAppSiteAssociation ||
        isNonEmptyJson(deepviewData)
      ) {
        const proFeaturesString = combineWords(
          [
            logo && "custom QR code logos",
            expiredUrl && "default expiration URLs",
            notFoundUrl && "not found URLs",
            assetLinks && "Asset Links",
            appleAppSiteAssociation && "Apple App Site Association",
            isNonEmptyJson(deepviewData) && "Deep View",
          ].filter(Boolean) as string[],
        );

        throw new DubApiError({
          code: "forbidden",
          message: `You can only set ${proFeaturesString} on a Pro plan and above. Upgrade to Pro to use these features.`,
        });
      }
    }

    const validDomain = await validateDomain(slug);

    if (validDomain.error && validDomain.code) {
      throw new DubApiError({
        code: validDomain.code,
        message: validDomain.error,
      });
    }

    // Add domain to Vercel if preview/production
    if (process.env.VERCEL === "1") {
      const vercelResponse = await addDomainToVercel(slug);

      if (
        vercelResponse.error &&
        vercelResponse.error.code !== "domain_already_in_use" // ignore this error
      ) {
        return new Response(vercelResponse.error.message, { status: 422 });
      }
    }

    const domainId = createId({ prefix: "dom_" });

    const logoUploaded = logo
      ? await storage.upload({
          key: `domains/${domainId}/logo_${nanoid(7)}`,
          body: logo,
        })
      : null;

    const domainRecord = await prisma.$transaction(
      async (tx) => {
        const totalDomains = await tx.domain.count({
          where: {
            projectId: workspace.id,
          },
        });

        if (totalDomains >= workspace.domainsLimit) {
          throw new DubApiError({
            code: "exceeded_limit",
            message: exceededLimitError({
              plan: workspace.plan,
              limit: workspace.domainsLimit,
              type: "domains",
            }),
          });
        }
        return await tx.domain.create({
          data: {
            id: domainId,
            slug: slug,
            projectId: workspace.id,
            primary: totalDomains === 0,
            ...(placeholder && { placeholder }),
            expiredUrl,
            notFoundUrl,
            ...(logoUploaded && { logo: logoUploaded.url }),
            ...(assetLinks && { assetLinks: JSON.parse(assetLinks) }),
            ...(appleAppSiteAssociation && {
              appleAppSiteAssociation: JSON.parse(appleAppSiteAssociation),
            }),
            ...(deepviewData && {
              deepviewData: JSON.parse(deepviewData),
            }),
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 5000,
      },
    );

    await createLink({
      ...DEFAULT_LINK_PROPS,
      domain: slug,
      key: "_root",
      url: "",
      tags: undefined,
      userId: session.user.id,
      projectId: workspace.id,
    });

    return NextResponse.json(
      transformDomain({
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
