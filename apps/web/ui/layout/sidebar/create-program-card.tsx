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
    <div className="relative mt-6 flex flex-col gap-3 overflow-hidden rounded-lg border bg-white p-3 pt-4">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div
          className="h-full w-full"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, #F35066 116.99999570846558deg, #9071F9 180deg, #5182FC 240.00000715255737deg, #F35066 360deg)",
            filter: "blur(60px)",
          }}
        />
      </div>
      <div className="relative flex items-center gap-2">
        <ConnectedDots4 className="size-4" />
      </div>

      <div className="relative flex flex-col gap-1">
        <h1 className="text-sm font-semibold text-neutral-900">Dub Partners</h1>
        <p className="text-sm text-neutral-800">
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
  );
}
