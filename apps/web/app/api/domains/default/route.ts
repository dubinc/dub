import { getDefaultDomains } from "@/lib/api/domains";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { getDefaultDomainsQuerySchema } from "@/lib/zod/schemas/domains";
import { DUB_DOMAINS_ARRAY, getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/domains/default - get default domains
export const GET = withWorkspace(
  async ({ req, workspace }) => {
    const searchParams = getSearchParams(req.url);
    const { search } = getDefaultDomainsQuerySchema.parse(searchParams);
    return NextResponse.json(await getDefaultDomains(workspace.id, { search }));
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
