import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/domains/default - get default domains
export const GET = withWorkspace(
  async ({ workspace }) => {
    const defaultDomains = await prisma.defaultDomains.findUnique({
      where: {
        projectId: workspace.id,
      },
      select: {
        dubsh: true,
        chatgpt: true,
        sptifi: true,
        gitnew: true,
        amznid: true,
        figpage: true,
        loooooooong: true,
      },
    });

    if (!defaultDomains) {
      return NextResponse.json([]);
    }

    const defaultDomainsArray = Object.keys(defaultDomains)
      .filter((key) => defaultDomains[key])
      .map((domain) =>
        DUB_DOMAINS_ARRAY.find((d) => d.replace(".", "") === domain),
      );

    return NextResponse.json(defaultDomainsArray);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);

const updateDefaultDomainsSchema = z.object({
  defaultDomains: z.array(z.enum(DUB_DOMAINS_ARRAY as [string, ...string[]])),
});

// PUT /api/domains/default - edit default domains
export const PUT = withWorkspace(
  async ({ req, workspace }) => {
    const { defaultDomains } = await updateDefaultDomainsSchema.parseAsync(
      await req.json(),
    );

    const response = await prisma.defaultDomains.update({
      where: {
        projectId: workspace.id,
      },
      data: {
        dubsh: defaultDomains.includes("dub.sh"),
        chatgpt: defaultDomains.includes("chatg.pt"),
        sptifi: defaultDomains.includes("spti.fi"),
        gitnew: defaultDomains.includes("git.new"),
        amznid: defaultDomains.includes("amzn.id"),
        loooooooong: defaultDomains.includes("loooooooo.ng"),
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
