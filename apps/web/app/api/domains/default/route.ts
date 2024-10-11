import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { getDefaultDomainsQuerySchema } from "@/lib/zod/schemas/domains";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/domains/default - get default domains
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { search } = getDefaultDomainsQuerySchema.parse(searchParams);

    const data = await prisma.defaultDomains.findUnique({
      where: {
        projectId: workspace.id,
      },
      select: {
        dubsh: true,
        dublink: true,
        chatgpt: true,
        sptifi: true,
        gitnew: true,
        callink: true,
        amznid: true,
        ggllink: true,
        figpage: true,
      },
    });

    let defaultDomains: string[] = [];

    if (data) {
      defaultDomains = Object.keys(data)
        .filter((key) => data[key])
        .map(
          (domain) =>
            DUB_DOMAINS_ARRAY.find((d) => d.replace(".", "") === domain)!,
        )
        .filter((domain) =>
          search ? domain?.toLowerCase().includes(search.toLowerCase()) : true,
        );
    }

    return NextResponse.json(defaultDomains);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);

const updateDefaultDomainsSchema = z.object({
  defaultDomains: z.array(z.enum(DUB_DOMAINS_ARRAY as [string, ...string[]])),
});

// PATCH /api/domains/default - edit default domains
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { defaultDomains } = await updateDefaultDomainsSchema.parseAsync(
      await req.json(),
    );

    if (workspace.plan === "free" && defaultDomains.includes("dub.link")) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only use dub.link on a Pro plan and above. Upgrade to Pro to use this domain.",
      });
    }

    const response = await prisma.defaultDomains.update({
      where: {
        projectId: workspace.id,
      },
      data: {
        dubsh: defaultDomains.includes("dub.sh"),
        dublink: defaultDomains.includes("dub.link"),
        chatgpt: defaultDomains.includes("chatg.pt"),
        sptifi: defaultDomains.includes("spti.fi"),
        gitnew: defaultDomains.includes("git.new"),
        callink: defaultDomains.includes("cal.link"),
        amznid: defaultDomains.includes("amzn.id"),
        ggllink: defaultDomains.includes("ggl.link"),
        figpage: defaultDomains.includes("fig.page"),
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
