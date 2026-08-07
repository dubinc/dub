import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";

const SOCIAL_PROVIDERS = ["google", "github"] as const;

type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number];

function isSocialProviderId(
  providerId: string,
): providerId is SocialProviderId {
  return (SOCIAL_PROVIDERS as readonly string[]).includes(providerId);
}

// Conditionally fill missing name / R2 avatar from Google or GitHub on sign-in.
export async function syncSocialProfileFromProvider({
  userId,
  providerId,
  accessToken,
}: {
  userId: string;
  providerId: string;
  accessToken?: string | null;
}) {
  if (!accessToken || !isSocialProviderId(providerId)) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      image: true,
    },
  });

  if (!user) {
    return;
  }

  const needsName = !user.name;
  const needsAvatar = !user.image || !isStored(user.image);

  if (!needsName && !needsAvatar) {
    return;
  }

  const profile = await fetchProviderProfile({
    providerId,
    accessToken,
  });

  if (!profile) {
    if (needsAvatar && user.image && !isStored(user.image)) {
      await backupUserAvatar({
        userId: user.id,
        image: user.image,
      });
    }
    return;
  }

  const data: { name?: string; image?: string } = {};

  if (needsName && profile.name) {
    data.name = profile.name;
  }

  if (needsAvatar) {
    const imageSource =
      profile.image ||
      (user.image && !isStored(user.image) ? user.image : null);

    if (imageSource) {
      const { url } = await storage.upload({
        key: `avatars/${user.id}`,
        body: imageSource,
      });
      data.image = url;
    }
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
  });
}

// Backup user avatar to R2 if it is not stored
export async function backupUserAvatar({
  userId,
  image,
}: {
  userId: string;
  image: string;
}) {
  const { url } = await storage.upload({
    key: `avatars/${userId}`,
    body: image,
  });

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      image: url,
    },
  });
}

// Fetch user profile from Google or GitHub
async function fetchProviderProfile({
  providerId,
  accessToken,
}: {
  providerId: SocialProviderId;
  accessToken: string;
}): Promise<{ name: string | null; image: string | null } | null> {
  try {
    if (providerId === "google") {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const profile = await response.json();

      return {
        name: profile.name?.trim() || null,
        image: profile.picture || null,
      };
    }

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const profile = await response.json();

    return {
      name: profile.name?.trim() || profile.login || null,
      image: profile.avatar_url || null,
    };
  } catch {
    return null;
  }
}
