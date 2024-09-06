import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createDotsUser } from "@/lib/dots/create-dots.user";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createAffiliateSchema = z.object({
  email: z.string(),
  linkId: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
  externalId: z.string().nullish(),
});

const affiliateSchema = z.object({
  id: z.string(),
  email: z.string(),
  linkId: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  countryCode: z.string().nullish(),
  externalId: z.string().nullish(),
});

// POST /api/affiliates – create an affiliate
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      externalId,
      linkId,
    } = createAffiliateSchema.parse(await parseRequestBody(req));

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

    // TODO: Check if the linkId is valid

    const affiliate = await prisma.affiliate.create({
      data: {
        projectId: workspace.id,
        linkId,
        email,
        firstName,
        lastName,
        phoneNumber,
        countryCode,
        externalId,
      },
    });

    // Create a Dots user
    // Note: Dots requires firstName, lastName, email, phoneNumber, countryCode to create a user
    // We need to find a better way to handle this. Because a client app maynot have all these fields before creating an affiliate
    // Move this to waitUntil

    const dotsUser = await createDotsUser({
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      email: email ?? "",
      phoneNumber: phoneNumber ?? "",
      countryCode: countryCode ?? "",
      metadata: {
        affiliateId: affiliate.id,
      },
    });

    // Update the affiliate with the Dots user ID
    await prisma.affiliate.update({
      where: {
        id: affiliate.id,
      },
      data: {
        dotsUserId: dotsUser.id,
      },
    });

    return NextResponse.json(affiliateSchema.parse(affiliate), { status: 201 });
  },
  {
    // requiredAddOn: "conversion",
    // requiredPermissions: ["conversions.write"],
  },
);
