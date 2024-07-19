import { DubApiError } from "@/lib/api/errors";
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
        dublink: true,
        chatgpt: true,
        sptifi: true,
        gitnew: true,
        amznid: true,
        ggllink: true,
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
        amznid: defaultDomains.includes("amzn.id"),
        ggllink: defaultDomains.includes("ggl.link"),
        figpage: defaultDomains.includes("fig.page"),
        loooooooong: defaultDomains.includes("loooooooo.ng"),
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
