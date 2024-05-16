import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { NextResponse } from "next/server";

// GET /api/admin/links/[linkId] – get a link as an admin
export const GET = withAdmin(async ({ params }) => {
  const { linkId } = params;

  let link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    const domain = await prisma.domain.findUnique({
      where: {
        id: linkId,
      },
    });
    if (domain) {
      link = {
        ...domain,
        domain: domain.slug,
        key: "_root",
        url: domain.target || "",
      } as unknown as LinkProps;
    }
  }

  return NextResponse.json(link);
});
