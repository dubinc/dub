"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PROGRAM_ONBOARDING_STEPS } from "@/lib/zod/schemas/program-onboarding";
import { Button, Wordmark, useMediaQuery } from "@dub/ui";
import { Menu } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useSidebar } from "./sidebar-context";

export function ProgramOnboardingHeader() {
  const pathname = usePathname();
  const { isMobile } = useMediaQuery();
  const { getValues } = useFormContext();
  const { isOpen, setIsOpen } = useSidebar();

  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onError: ({ error }) => {
      console.log(error);
      toast.error(error.serverError);
    },
  });

  const saveAndExit = async () => {
    if (!workspaceId) return;

    let data = getValues();

    data = {
      ...data,
      url: data.url === "" ? null : data.url,

      partners:
        data?.partners?.filter(
          (partner) => partner.email !== "" && partner.key !== "",
        ) ?? null,

      ...(data.programType === "new" && {
        rewardful: null,
      }),

      ...(data.programType === "import" && {
        type: null,
        amount: null,
        maxDuration: null,
      }),
    };

    const currentPath = pathname.replace(`/${workspaceSlug}`, "");
    const currentStep = PROGRAM_ONBOARDING_STEPS.find(
      (s) => s.href === currentPath,
    )?.step;

    await executeAsync({
      ...data,
      workspaceId,
      step: "save-and-exit",
      currentStep,
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-5">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md p-1 hover:bg-neutral-100 md:hidden"
        >
          <Menu className="h-5 w-5 text-neutral-600" />
        </button>
        <Link href={`/${workspaceSlug}`} className="flex items-center">
          <Wordmark className="h-7" />
        </Link>
        <h1 className="hidden text-base font-semibold text-neutral-700 md:block">
          Create partner program
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/${workspaceSlug}`}
          className="group flex h-8 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm text-neutral-600 transition-all hover:bg-neutral-100"
        >
          Cancel
        </Link>

        <Button
          text="Save and exit"
          variant="secondary"
          className="h-8 w-auto"
          loading={isPending}
          onClick={saveAndExit}
        />
      </div>
    </header>
  );
}
