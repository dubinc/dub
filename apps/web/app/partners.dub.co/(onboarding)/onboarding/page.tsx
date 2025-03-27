import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
import { OnboardingForm } from "./onboarding-form";

export default function PartnerOnboarding() {
  return (
    <div className="mx-auto my-10 flex w-full max-w-[480px] flex-col items-center md:mt-14">
      <h1 className="animate-slide-up-fade text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Complete your partner profile
      </h1>
      <div className="animate-slide-up-fade w-full rounded-xl p-8 [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <div className="absolute inset-0 bg-white/50 [mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]" />
        <div className="relative">
          <Suspense fallback={<OnboardingForm />}>
            <OnboardingFormRSC />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function OnboardingFormRSC() {
  const { user } = await getSession();

  const partner = await prisma.partner.findUnique({
    where: {
      email: user.email,
    },
  });

  return <OnboardingForm partner={partner} />;
}
