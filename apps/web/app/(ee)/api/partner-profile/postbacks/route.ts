import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { createToken } from "@/lib/api/oauth/utils";
import { parseRequestBody } from "@/lib/api/utils";
import { withPartnerProfile } from "@/lib/auth/partner";
import { identifyPostbackChannel } from "@/lib/postback/api/utils";
import {
  MAX_POSTBACKS,
  POSTBACK_SECRET_LENGTH,
  POSTBACK_SECRET_PREFIX,
} from "@/lib/postback/constants";
import {
  createPostbackInputSchema,
  createPostbackOutputSchema,
  postbackSchema,
} from "@/lib/postback/schemas";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/postbacks
export const GET = withPartnerProfile(
  async ({ partner }) => {
    const postbacks = await prisma.postback.findMany({
      where: {
        partnerId: partner.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(z.array(postbackSchema).parse(postbacks));
  },
  {
    requiredPermission: "postbacks.read",
    featureFlag: "postbacks",
  },
);

// POST /api/partner-profile/postbacks
export const POST = withPartnerProfile(
  async ({ partner, req }) => {
    const { name, url, triggers } = createPostbackInputSchema.parse(
      await parseRequestBody(req),
    );

    const postbackCount = await prisma.postback.count({
      where: {
        partnerId: partner.id,
      },
    });

    if (postbackCount >= MAX_POSTBACKS) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: `Maximum number of postbacks (${MAX_POSTBACKS}) reached.`,
      });
    }

    const secret = createToken({
      prefix: POSTBACK_SECRET_PREFIX,
      length: POSTBACK_SECRET_LENGTH,
    });

    const postback = await prisma.postback.create({
      data: {
        id: createId({ prefix: "pb_" }),
        partnerId: partner.id,
        name,
        url,
        secret,
        triggers,
        receiver: identifyPostbackChannel(url),
      },
    });

    return NextResponse.json(createPostbackOutputSchema.parse(postback), {
      status: 201,
    });
  },
  {
    requiredPermission: "postbacks.write",
    featureFlag: "postbacks",
  },
);
