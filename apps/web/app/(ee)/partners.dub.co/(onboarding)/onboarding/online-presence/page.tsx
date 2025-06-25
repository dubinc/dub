import { getSession } from "@/lib/auth";
import { OnlinePresenceForm } from "@/ui/partners/online-presence-form";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
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
        website: true,
        youtube: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        tiktok: true,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!partner) {
    throw new Error("Partner not found");
  }

  return (
    <OnlinePresencePageClient
      country={partner.country}
      partner={{
        ...partner,
        ...(application?.website && !partner.website
          ? { website: application?.website }
          : {}),
      }}
    />
  );
}
