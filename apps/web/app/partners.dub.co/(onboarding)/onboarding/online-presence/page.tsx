import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
import { OnlinePresenceForm } from "./online-presence-form";

export default function OnlinePresencePage() {
  return (
    <div className="relative mx-auto my-10 w-full max-w-[416px] md:mt-14">
      <div className="absolute inset-0 bg-white/60 [mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]" />
      <div className="relative">
        <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
          Your online presence
        </h1>

        <p className="mt-2 text-sm text-neutral-600">
          These improve your reputation score and rank you higher. Verification
          is optional and can be done later.
        </p>

        <div className="mt-8">
          <Suspense
            fallback={<OnlinePresenceForm country={null} partner={null} />}
          >
            <OnlinePresenceFormRSC />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function OnlinePresenceFormRSC() {
  const { user } = await getSession();

  const partner = await prisma.partner.findFirst({
    where: {
      users: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      country: true,
      website: true,
      instagram: true,
      tiktok: true,
      youtube: true,
      twitter: true,
    },
  });

  if (!partner) {
    throw new Error("Partner not found");
  }

  return <OnlinePresenceForm country={partner.country} partner={partner} />;
}
