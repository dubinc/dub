import {
  addDomainToVercel,
  domainExists,
  setRootDomain,
} from "@/lib/api/domains";
import { withSession } from "@/lib/auth";
import { isReservedKey } from "@/lib/edge-config";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import {
  DEFAULT_REDIRECTS,
  FREE_PROJECTS_LIMIT,
  validDomainRegex,
  validSlugRegex,
} from "@dub/utils";
import { NextResponse } from "next/server";

const createProjectSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(48, "Slug must be less than 48 characters")
    .transform((v) => v.toLowerCase())
    .refine((v) => validSlugRegex.test(v), { message: "Invalid slug format" })
    .refine(async (v) => !((await isReservedKey(v)) || DEFAULT_REDIRECTS[v]), {
      message: "Cannot use reserved slugs",
    }),
  domain: z
    .string()
    .refine((v) => validDomainRegex.test(v), {
      message: "Invalid domain format",
    })
    .optional(),
});

// GET /api/projects - get all projects for the current user
export const GET = withSession(async ({ session }) => {
  const projects = await prisma.project.findMany({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      domains: true,
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
    },
  });
  return NextResponse.json(projects);
});

export const POST = withSession(async ({ req, session }) => {
  try {
    const { name, slug, domain } = await createProjectSchema.parseAsync(
      await req.json(),
    );

    const freeProjects = await prisma.project.count({
      where: {
        plan: "free",
        users: {
          some: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
    });

    if (freeProjects >= FREE_PROJECTS_LIMIT) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `You can only create up to ${FREE_PROJECTS_LIMIT} free projects. Additional projects require a paid plan.`,
      });
    }

    const [slugExist, domainExist] = await Promise.all([
      prisma.project.findUnique({
        where: {
          slug,
        },
        select: {
          slug: true,
        },
      }),
      domain ? domainExists(domain) : false,
    ]);

    if (slugExist) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Slug is already in use.",
      });
    }

    if (domainExist) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Domain is already in use.",
      });
    }

    const [projectResponse, domainRepsonse] = await Promise.all([
      prisma.project.create({
        data: {
          name,
          slug,
          users: {
            create: {
              userId: session.user.id,
              role: "owner",
            },
          },
          ...(domain && {
            domains: {
              create: {
                slug: domain,
                primary: true,
              },
            },
          }),
          billingCycleStart: new Date().getDate(),
        },
        include: {
          domains: true,
        },
      }),
      domain && addDomainToVercel(domain),
    ]);

    // if domain is specified and it was successfully added to Vercel
    // update it in Redis cache
    if (domain && domainRepsonse && !domainRepsonse.error) {
      await setRootDomain({
        id: projectResponse.domains[0].id,
        domain,
        projectId: projectResponse.id,
      });
    }

    return NextResponse.json(projectResponse);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
