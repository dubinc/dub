import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createAffiliateSchema = z.object({
  email: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
  externalId: z.string().nullish(),
});

const affiliateSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
  externalId: z.string().nullish(),
});

// POST /api/affiliates – create an affiliate
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { email, firstName, lastName, phoneNumber, countryCode, externalId } =
      createAffiliateSchema.parse(await parseRequestBody(req));

    const existingAffiliate = await prisma.affiliate.findFirst({
      where: {
        projectId: workspace.id,
        email,
      },
    });

    if (existingAffiliate) {
      throw new DubApiError({
        code: "conflict",
        message: `An affiliate with email ${email} already exists.`,
      });
    }

    const affiliate = await prisma.affiliate.create({
      data: {
        projectId: workspace.id,
        email,
        firstName,
        lastName,
        phoneNumber,
        countryCode,
        externalId,
      },
    });

    return NextResponse.json(affiliateSchema.parse(affiliate), { status: 201 });
  },
  {
    // requiredAddOn: "conversion",
    // requiredPermissions: ["conversions.write"],
  },
);
