import { NextResponse } from "next/server";
import {
  addDomainToVercel,
  domainExists,
  validateDomain,
} from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { isReservedKey } from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import { DEFAULT_REDIRECTS, validSlugRegex } from "@dub/utils";

// GET /api/projects - get all projects for the current user
export const GET = withAuth(async ({ session, headers }) => {
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
    },
  });
  return NextResponse.json(projects, { headers });
});

export const POST = withAuth(async ({ req, session }) => {
  const { name, slug, domain } = await req.json();
  if (!name || !slug || !domain) {
    return new Response("Missing name or slug or domain", { status: 422 });
  }
  let slugError: string | null = null;

  // check if slug is too long
  if (slug.length > 48) {
    slugError = "Slug must be less than 48 characters";

    // check if slug is valid
  } else if (!validSlugRegex.test(slug)) {
    slugError = "Invalid slug";

    // check if slug is reserved
  } else if ((await isReservedKey(slug)) || DEFAULT_REDIRECTS[slug]) {
    slugError = "Cannot use reserved slugs";
  }

  const validDomain = await validateDomain(domain);
  if (slugError || validDomain !== true) {
    return NextResponse.json(
      {
        slugError,
        domainError: validDomain === true ? null : validDomain,
      },
      { status: 422 },
    );
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
    domainExists(domain),
  ]);
  if (slugExist || domainExist) {
    return NextResponse.json(
      {
        slugError: slugExist ? "Slug is already in use." : null,
        domainError: domainExist ? "Domain is already in use." : null,
      },
      { status: 422 },
    );
  }
  const response = await Promise.allSettled([
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
        domains: {
          create: {
            slug: domain,
            primary: true,
          },
        },
        billingCycleStart: new Date().getDate(),
      },
    }),
    addDomainToVercel(domain),
  ]);

  return NextResponse.json(response);
});
