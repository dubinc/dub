import { getSession } from "@/lib/auth";
import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { PartnerPlatformProps } from "@/lib/types";
import { partnerPlatformSchema } from "@/lib/zod/schemas/partners";
import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import { Suspense } from "react";
import * as z from "zod/v4";
import { OnlinePresencePageClient } from "./page-client";

export default function OnlinePresencePage() {
  return (
    <div className="relative mx-auto w-full max-w-[416px] text-center md:mt-4">
      <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Your online presence
      </h1>

      <p className="animate-slide-up-fade text-content-subtle mt-1 text-sm [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        These improve your reputation score and rank you higher. Verification is
        optional and can be done later.
      </p>

      <div className="animate-slide-up-fade mt-8 grid gap-4 [animation-delay:750ms] [animation-duration:1s] [animation-fill-mode:both]">
        <Suspense fallback={<OnlinePresenceForm partner={null} />}>
          <OnlinePresenceFormRSC />
        </Suspense>
      </div>
    </div>
  );
}

async function OnlinePresenceFormRSC() {
  const { user } = await getSession();

  const [partner, application] = await Promise.all([
    prisma.partner.findFirst({
      where: {
        users: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        email: true,
        country: true,
        platforms: true,
      },
    }),

    prisma.programApplication.findFirst({
      where: {
        enrollment: {
          partner: {
            users: {
              some: {
                userId: user.id,
              },
            },
          },
        },
      },
      select: {
        website: true,
        youtube: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        tiktok: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!partner) {
    throw new Error("Partner not found");
  }

  // Merge social handles from a partner application into the partner platforms list.
  const platforms: PartnerPlatformProps[] = z
    .array(partnerPlatformSchema)
    .parse(partner.platforms);

  if (application) {
    const socialPlatformsMap = buildSocialPlatformLookup(platforms);

    const APPLICATION_SOCIAL_PLATFORMS = [
      "website",
      "youtube",
      "twitter",
      "linkedin",
      "instagram",
      "tiktok",
    ] as const satisfies readonly PlatformType[];

    for (const platform of APPLICATION_SOCIAL_PLATFORMS) {
      const handle = application[platform];

      // Application-provided handles are added only if the partner does not already have that platform.
      if (handle && !socialPlatformsMap[platform]) {
        platforms.push({
          type: platform,
          identifier: handle,
          platformId: null,
          verifiedAt: null,
          subscribers: BigInt(0),
          views: BigInt(0),
          posts: BigInt(0),
        });
      }
    }
  }

  return <OnlinePresencePageClient partner={{ ...partner, platforms }} />;
}
