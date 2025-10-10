"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/types";
import { PROGRAM_ONBOARDING_STEPS } from "@/lib/zod/schemas/program-onboarding";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Check, Lock, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "./sidebar-context";

export function ProgramOnboardingSteps() {
  const pathname = usePathname();
  const { isMobile } = useMediaQuery();
  const { isOpen, setIsOpen } = useSidebar();
  const { slug } = useParams<{ slug: string }>();
  const [programOnboarding] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  const currentPath = pathname.replace(`/${slug}`, "");

  const currentStep = PROGRAM_ONBOARDING_STEPS.find(
    (s) => s.href === currentPath,
  );

  const lastCompletedStep =
    programOnboarding?.lastCompletedStep ?? "get-started";

  const lastCompletedStepObj = PROGRAM_ONBOARDING_STEPS.find(
    (s) => s.step === lastCompletedStep,
  );

  return (
    <>
      <div
        className={cn(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-screen transition-[background-color,backdrop-filter] md:sticky md:top-0 md:z-0 md:h-[calc(100vh-3.5rem)] md:w-full md:bg-transparent",
          isOpen
            ? "bg-black/20 backdrop-blur-sm"
            : "bg-transparent max-md:pointer-events-none",
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        <div
          className={cn(
            "relative h-full w-[240px] max-w-full bg-white transition-transform md:translate-x-0",
            !isOpen && "-translate-x-full",
          )}
        >
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between md:hidden">
              <h2 className="text-sm font-medium">Program Setup</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 hover:bg-neutral-100"
              >
                <X className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
            <nav className="space-y-1">
              {PROGRAM_ONBOARDING_STEPS.map(
                ({ step, label, href, stepNumber }) => {
                  const current = currentPath === href;

                  const completed =
                    step === lastCompletedStep ||
                    (lastCompletedStepObj?.stepNumber ?? 0) >= stepNumber ||
                    (currentStep?.stepNumber ?? 0) >= stepNumber;

                  const isDisabled = !completed && !current;

                  return isDisabled ? (
                    <div
                      key={step}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2",
                        "cursor-not-allowed opacity-60",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                          "bg-neutral-200 text-neutral-500",
                        )}
                      >
                        {stepNumber === 5 ? (
                          <Lock className="size-3" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                      <span className="text-sm font-medium text-neutral-400">
                        {label}
                      </span>
                    </div>
                  ) : (
                    <Link
                      key={step}
                      href={`/${slug}${href}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 hover:bg-neutral-100",
                        current && "bg-blue-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                          completed && "bg-black text-white",
                          current && "bg-blue-500 text-white",
                          !current &&
                            !completed &&
                            "border border-neutral-200 text-neutral-500",
                        )}
                      >
                        {stepNumber === 5 ? (
                          <Lock className="size-3" />
                        ) : completed ? (
                          <Check className="size-3" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          current && "text-blue-500",
                          !current && !completed && "text-neutral-600",
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                },
              )}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
