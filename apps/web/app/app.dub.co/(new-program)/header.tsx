"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import usePrograms from "@/lib/swr/use-programs";
import useWorkspace from "@/lib/swr/use-workspace";
import { PROGRAM_ONBOARDING_STEPS } from "@/lib/zod/schemas/program-onboarding";
import { Button, Wordmark, useMediaQuery } from "@dub/ui";
import { Menu } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useSidebar } from "./sidebar-context";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { getValues } = useFormContext();
  const { isOpen, setIsOpen } = useSidebar();
  const { programs, loading: programsLoading } = usePrograms();

  const {
    id: workspaceId,
    slug: workspaceSlug,
    partnersEnabled,
    loading: workspaceLoading,
    mutate: mutateWorkspace,
  } = useWorkspace();

  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: async () => {
      mutateWorkspace();
      router.push(`/${workspaceSlug}`);
    },
    onError: ({ error }) => {
      console.log(error);
      toast.error(error.serverError);
    },
  });

  if (programsLoading || workspaceLoading) {
    return (
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div className="flex items-center gap-5">
          <div className="h-7 w-20 animate-pulse rounded-md bg-neutral-200" />
          <div className="hidden h-5 w-40 animate-pulse rounded-md bg-neutral-200 md:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </header>
    );
  }

  if ((programs && programs.length > 0) || !partnersEnabled) {
    router.push(`/${workspaceSlug}`);
  }

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
        <Link href="/" className="flex items-center">
          <Wordmark className="h-7" />
        </Link>
        <h1 className="hidden text-base font-semibold text-neutral-700 md:block">
          Create partner program
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="group flex h-7 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm text-neutral-600 transition-all hover:bg-neutral-100"
        >
          Cancel
        </Link>

        <Button
          text="Save and exit"
          variant="secondary"
          className="h-7 w-auto"
          loading={isPending}
          onClick={saveAndExit}
        />
      </div>
    </header>
  );
}
