import { NewBackground } from "@/ui/shared/new-background";
import { Wordmark } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { NextButton } from "../next-button";
import TrackSignup from "./track-signup";

export default function Welcome() {
  return (
    <>
      <TrackSignup />
      <NewBackground showAnimation showGradient={false} />
      <div className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="flex max-w-sm flex-col items-center px-4 py-16 text-center">
          <div className="animate-slide-up-fade relative flex w-auto items-center justify-center px-6 py-2 [--offset:20px] [animation-duration:1.3s] [animation-fill-mode:both]">
            <Gradient className="opacity-10 mix-blend-overlay" />
            <Wordmark className="relative h-24 sm:h-36" />
            <Gradient className="opacity-50 mix-blend-hard-light" />
          </div>
          <h1 className="animate-slide-up-fade mt-14 text-xl font-semibold text-neutral-900 [--offset:10px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
            Welcome to Dub
          </h1>
          <p className="animate-slide-up-fade mt-2 text-balance text-base text-neutral-500 [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
            Dub gives you superpowers to track how your marketing efforts
            convert to revenue.
          </p>
          <div className="animate-slide-up-fade mt-8 w-full [--offset:10px] [animation-delay:750ms] [animation-duration:1s] [animation-fill-mode:both]">
            <NextButton text="Get started" step="workspace" />
          </div>
        </div>
      </div>
    </>
  );
}

function Gradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2",
        className,
      )}
    >
      <div className="size-full -scale-x-[1.8] blur-[40px]">
        <div
          className={cn(
            "size-full -rotate-90 saturate-[3]",
            "bg-[conic-gradient(from_279deg,#EAB308_47deg,#F00_121deg,#00FFF9_190deg,#855AFC_251deg,#3A8BFD_267deg,#A3ECB3_314deg,#EAB308_360deg)]",
          )}
        />
      </div>
    </div>
  );
}
