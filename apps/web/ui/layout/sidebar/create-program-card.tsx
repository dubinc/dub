import usePrograms from "@/lib/swr/use-programs";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { PROGRAM_ONBOARDING_STEPS } from "@/lib/zod/schemas/program-onboarding";
import { buttonVariants, ConnectedDots4 } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export function CreateProgramCard() {
  const {
    slug,
    store,
    partnersEnabled,
    loading: workspaceLoading,
  } = useWorkspace();

  const { programs, loading: programsLoading } = usePrograms();

  if (
    !partnersEnabled ||
    programsLoading ||
    workspaceLoading ||
    (programs && programs.length > 0)
  ) {
    return null;
  }

  const programData = store?.programOnboarding as ProgramData;
  const currentStep =
    programData?.currentStep || programData?.lastCompletedStep || "get-started";

  const path = PROGRAM_ONBOARDING_STEPS.find(
    (s) => s.step === currentStep,
  )?.href;

  return (
    <div className="relative mt-6 overflow-hidden rounded-[8px] bg-white p-px shadow-sm">
      <div className="absolute inset-0 rounded-[inherit] border border-black/10" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-50 blur-[50px]",
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-1/3 h-full",
            "bg-[conic-gradient(#F35066_117deg,#9071F9_180deg,#5182FC_240deg,#F35066_360deg)]",
            "[mask-image:radial-gradient(black_80%,transparent_50%)]",
          )}
        />
      </div>

      <div className="relative flex flex-col gap-3 rounded-[7px] bg-white/70 p-3">
        <div className="flex items-center gap-2">
          <ConnectedDots4 className="size-4 text-neutral-900" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-semibold text-neutral-900">
            Dub Partners
          </h1>
          <p className="text-sm text-neutral-600">
            Grow your revenue on autopilot with Dub Partners
          </p>
        </div>

        <Link
          href={`/${slug}${path}`}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "flex h-8 items-center justify-center rounded-md border px-3 text-sm",
          )}
        >
          {store?.programOnboarding ? "Finish creating" : "Create program"}
        </Link>
      </div>
    </div>
  );
}
