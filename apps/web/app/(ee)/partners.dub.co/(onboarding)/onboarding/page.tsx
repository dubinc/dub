import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Suspense } from "react";
import { OnboardingForm } from "./onboarding-form";

export default function PartnerOnboarding() {
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col items-center md:mt-4">
      <h1 className="animate-slide-up-fade text-center text-xl font-semibold [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Create your partner profile
      </h1>
      <div className="animate-slide-up-fade w-full pt-8 [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <Suspense fallback={<OnboardingForm />}>
          <OnboardingFormRSC />
        </Suspense>
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
