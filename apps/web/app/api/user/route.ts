import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import {
  assertEmailAvailableForIdentitySync,
  isImageReferencedByPartner,
  requestSyncedEmailChange,
  syncNameAndImageToPartner,
} from "@/lib/partners/sync-partner-identity";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { uploadedImageSchema } from "@/lib/zod/schemas/images";
import {
  APP_DOMAIN,
  PARTNERS_DOMAIN,
  PARTNERS_HOSTNAMES,
  R2_URL,
  nanoid,
  trim,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const updateUserSchema = z.object({
  name: z.preprocess(trim, z.string().min(1).max(64)).optional(),
  email: z.preprocess(trim, z.email()).optional(),
  image: uploadedImageSchema.nullish(),
  source: z.preprocess(trim, z.string().min(1).max(32)).optional(),
  defaultWorkspace: z.preprocess(trim, z.string().min(1)).optional(),
  syncIdentity: z.boolean().optional(),
});

// GET /api/user – get a specific user
export const GET = withSession(async ({ session }) => {
  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        source: true,
        defaultWorkspace: true,
        defaultPartnerId: true,
        passwordHash: true,
        createdAt: true,
      },
    }),

    prisma.account.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        provider: true,
      },
    }),
  ]);

  return NextResponse.json({
    ...user,
    provider: account?.provider,
    hasPassword: user?.passwordHash !== null,
    passwordHash: undefined,
  });
});

// PATCH /api/user – edit a specific user
export const PATCH = withSession(async ({ req, session }) => {
  let { name, email, image, source, defaultWorkspace, syncIdentity } =
    await updateUserSchema.parseAsync(await req.json());

  const hostName = req.headers.get("host") || "";
  const isPartnersDomain = PARTNERS_HOSTNAMES.has(hostName);
  const emailChangeHost = isPartnersDomain ? PARTNERS_DOMAIN : APP_DOMAIN;
  const partnerId = session.user.defaultPartnerId;
  const shouldSyncIdentity =
    syncIdentity === true && isPartnersDomain && !!partnerId;

  if (shouldSyncIdentity && partnerId) {
    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId: session.user.id,
          partnerId,
        },
      },
      select: {
        role: true,
      },
    });

    if (
      !partnerUser ||
      !hasPermission(partnerUser.role, "partner_profile.update")
    ) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You don't have permission to update the partner profile linked to this account.",
      });
    }
  }

  if (image) {
    const { url } = await storage.upload({
      key: `avatars/${session.user.id}_${nanoid(7)}`,
      body: image,
    });
    image = url;
  }

  if (defaultWorkspace) {
    const workspaceUser = await prisma.projectUsers.findFirst({
      where: {
        userId: session.user.id,
        project: {
          slug: defaultWorkspace,
        },
      },
    });

    if (!workspaceUser) {
      throw new DubApiError({
        code: "forbidden",
        message: `You don't have access to the workspace ${defaultWorkspace}.`,
      });
    }
  }

  // Verify email ownership if the email is being changed
  if (email && email !== session.user.email) {
    if (shouldSyncIdentity && partnerId) {
      await assertEmailAvailableForIdentitySync({
        newEmail: email,
        userId: session.user.id,
        partnerId,
      });

      await requestSyncedEmailChange({
        currentEmail: session.user.email!,
        newEmail: email,
        userId: session.user.id,
        partnerId,
        hostName: PARTNERS_DOMAIN,
        redirectTo: "/account/settings",
      });
    } else {
      const userWithEmail = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (userWithEmail) {
        throw new DubApiError({
          code: "conflict",
          message: "Email is already in use.",
        });
      }

      await confirmEmailChange({
        email: session.user.email,
        newEmail: email,
        identifier: session.user.id,
        hostName: emailChangeHost,
      });
    }
  }

  const response = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      ...(name && { name }),
      ...(image !== undefined && { image: image ?? null }),
      ...(source && { source }),
      ...(defaultWorkspace && { defaultWorkspace }),
    },
  });

  if (shouldSyncIdentity && partnerId) {
    await syncNameAndImageToPartner({
      partnerId,
      ...(name !== undefined && name && { name }),
      ...(image !== undefined && { image }),
    });
  }

  waitUntil(
    (async () => {
      // Delete only if a new image is uploaded and the old image exists.
      // Skip if the partner profile still references the old image (e.g. user
      // chose to update login account only after a prior identity sync).
      if (
        image &&
        session.user.image &&
        session.user.image.startsWith(`${R2_URL}/avatars/${session.user.id}`)
      ) {
        const partnerStillUsesImage =
          partnerId &&
          (await isImageReferencedByPartner({
            partnerId,
            imageUrl: session.user.image,
          }));

        if (!partnerStillUsesImage) {
          await storage.delete({
            key: session.user.image.replace(`${R2_URL}/`, ""),
          });
        }
      }
    })(),
  );

  return NextResponse.json(response);
});

export const PUT = PATCH;

// DELETE /api/user – delete a specific user
export const DELETE = withSession(async ({ session }) => {
  const userIsOwnerOfWorkspaces = await prisma.projectUsers.findMany({
    where: {
      userId: session.user.id,
      role: "owner",
    },
  });
  if (userIsOwnerOfWorkspaces.length > 0) {
    return new Response(
      "You must transfer ownership of your workspaces or delete them before you can delete your account.",
      { status: 422 },
    );
  } else {
    const user = await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });
    // if the user has a custom avatar and it is stored by their userId, delete it
    if (
      user.image &&
      user.image.startsWith(`${R2_URL}/avatars/${session.user.id}`)
    ) {
      await storage.delete({ key: user.image.replace(`${R2_URL}/`, "") });
    }
    return NextResponse.json(user);
  }
});
