import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { redirect } from "next/navigation";
import { OnlinePresenceForm } from "./online-presence-form";

export default async function OnboardingOnlinePresence() {
  const { user } = await getSession();

  const partner = await prisma.partner.findFirst({
    where: {
      ...(user.defaultPartnerId && {
        id: user.defaultPartnerId,
      }),
      users: {
        some: { userId: user.id },
      },
    },
  });

  if (!partner) redirect("/programs");

  return (
    <div className="relative mx-auto my-10 w-full max-w-[416px] md:mt-14">
      <div className="absolute inset-0 bg-white/60 [mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]" />
      <div className="relative">
        <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
          Your online presence
        </h1>

        <OnlinePresenceForm country={partner.country} />
      </div>
    </div>
  );
}
