import { DubApiError } from "@/lib/api/errors";
import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";

export async function assertEmailAvailableForIdentitySync({
  newEmail,
  userId,
  partnerId,
}: {
  newEmail: string;
  userId: string;
  partnerId: string;
}) {
  const [userWithEmail, partnerWithEmail] = await Promise.all([
    prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    }),
    prisma.partner.findUnique({
      where: { email: newEmail },
      select: { id: true },
    }),
  ]);

  if (userWithEmail && userWithEmail.id !== userId) {
    throw new DubApiError({
      code: "conflict",
      message: "Email is already in use.",
    });
  }

  if (partnerWithEmail && partnerWithEmail.id !== partnerId) {
    throw new DubApiError({
      code: "conflict",
      message: `Email ${newEmail} is already in use. Do you want to merge your partner accounts instead? (https://d.to/merge-partners)`,
    });
  }
}

async function copyImageToPartnerStorage({
  partnerId,
  imageUrl,
}: {
  partnerId: string;
  imageUrl: string;
}) {
  const { url } = await storage.upload({
    key: `partners/${partnerId}/image_${nanoid(7)}`,
    body: imageUrl,
  });

  return url;
}

async function copyImageToUserStorage({
  userId,
  imageUrl,
}: {
  userId: string;
  imageUrl: string;
}) {
  const { url } = await storage.upload({
    key: `avatars/${userId}_${nanoid(7)}`,
    body: imageUrl,
  });

  return url;
}

export async function syncNameAndImageToPartner({
  partnerId,
  name,
  image,
}: {
  partnerId: string;
  name?: string;
  image?: string | null;
}) {
  const hasNameUpdate = name !== undefined;
  const hasImageUpdate = image !== undefined;

  if (!hasNameUpdate && !hasImageUpdate) {
    return;
  }

  let partnerImage = image;

  if (image) {
    partnerImage = await copyImageToPartnerStorage({
      partnerId,
      imageUrl: image,
    });
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      ...(hasNameUpdate && name && { name }),
      ...(hasImageUpdate && { image: partnerImage ?? null }),
    },
  });
}

export async function syncNameAndImageToUser({
  userId,
  name,
  image,
}: {
  userId: string;
  name?: string;
  image?: string | null;
}) {
  const hasNameUpdate = name !== undefined;
  const hasImageUpdate = image !== undefined;

  if (!hasNameUpdate && !hasImageUpdate) {
    return;
  }

  let userImage = image;

  if (image) {
    userImage = await copyImageToUserStorage({ userId, imageUrl: image });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(hasNameUpdate && name && { name }),
      ...(hasImageUpdate && { image: userImage ?? null }),
    },
  });
}

export async function isImageReferencedByPartner({
  partnerId,
  imageUrl,
}: {
  partnerId: string;
  imageUrl: string;
}) {
  const partner = await prisma.partner.findFirst({
    where: {
      id: partnerId,
      image: imageUrl,
    },
    select: { id: true },
  });

  return !!partner;
}

export async function requestSyncedEmailChange({
  currentEmail,
  newEmail,
  userId,
  partnerId,
  hostName,
  redirectTo,
}: {
  currentEmail: string;
  newEmail: string;
  userId: string;
  partnerId: string;
  hostName: string;
  redirectTo: "/profile" | "/account/settings";
}) {
  await confirmEmailChange({
    email: currentEmail,
    newEmail,
    identifier: userId,
    hostName,
    syncIdentity: true,
    partnerId,
    redirectTo,
  });
}
