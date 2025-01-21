import { ConnectedDots4 } from "@dub/ui/icons";
import { OnboardingForm } from "./onboarding-form";

export default function Onboarding() {
  return (
    <div className="mx-auto my-10 flex w-full max-w-sm flex-col items-center md:mt-14">
      <div className="animate-slide-up-fade flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white backdrop-blur-sm [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        <ConnectedDots4 className="size-5 text-neutral-900" />
      </div>
      <h1 className="animate-slide-up-fade mt-6 text-lg font-medium [--offset:8px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Create your Dub Partner profile
      </h1>
      <div className="animate-slide-up-fade mt-8 w-full [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        <OnboardingForm />
      </div>
    </div>
  );
}
