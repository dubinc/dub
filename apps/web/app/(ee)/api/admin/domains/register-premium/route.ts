import { initiatePremiumDomainRegistration } from "@/lib/api/domains/initiate-premium-domain-registration";
import { normalizeDomainInput } from "@/lib/api/domains/normalize-domain-input";
import { DubApiError } from "@/lib/api/errors";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyFormatter } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = z.object({
  domain: z.string().min(1).transform(normalizeDomainInput),
  workspaceSlug: z.string().min(1).trim().toLowerCase(),
});

// POST /api/admin/domains/register-premium
export const POST = withAdmin(
  async ({ req }) => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }

    const { domain, workspaceSlug } = parsed.data;

    if (!domain) {
      return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
    }

    if (!domain.endsWith(".link")) {
      return NextResponse.json(
        { error: "Only .link domains are supported." },
        { status: 400 },
      );
    }

    const workspace = await prisma.project.findUnique({
      where: { slug: workspaceSlug },
      select: {
        id: true,
        slug: true,
        plan: true,
        stripeId: true,
        trialEndsAt: true,
        invoicePrefix: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace "${parsed.data.workspaceSlug}" not found.` },
        { status: 404 },
      );
    }

    try {
      const response = await initiatePremiumDomainRegistration({
        domain,
        workspace,
        skipWorkspaceChecks: true,
      });
      return NextResponse.json({
        success: true,
        message: `Payment initiated (${currencyFormatter(response.registrationPriceCents)}). Upon a successful charge, please register the domain manually via Dynadot.`,
        ...response,
      });
    } catch (error) {
      if (error instanceof DubApiError) {
        const status =
          error.code === "conflict"
            ? 409
            : error.code === "unprocessable_entity"
              ? 422
              : error.code === "forbidden"
                ? 403
                : 400;

        return NextResponse.json({ error: error.message }, { status });
      }

      throw error;
    }
  },
  {
    requiredRoles: ["owner"],
  },
);
