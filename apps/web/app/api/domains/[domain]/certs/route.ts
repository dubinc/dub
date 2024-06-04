import { generateCert } from "@/lib/api/domains/generate-cert-vercel";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/certs – generate a certificate for a domain on Vercel
export const POST = withWorkspace(
  async ({ domain }) => {
    const data = await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
    });

    if (!data) {
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found",
      });
    }

    const response = await generateCert(domain);

    console.log("response", response);

    return NextResponse.json(response);
  },
  {
    domainChecks: true,
  },
);
