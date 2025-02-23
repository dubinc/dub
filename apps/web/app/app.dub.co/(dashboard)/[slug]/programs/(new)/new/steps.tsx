"use client";

import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Check, Lock, Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Steps() {
  const pathname = usePathname();
  const { isMobile } = useMediaQuery();
  const [isOpen, setIsOpen] = useState(false);
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    document.body.style.overflow = isOpen && isMobile ? "hidden" : "auto";
  }, [isOpen, isMobile]);

  const steps = [
    {
      step: 1,
      label: "Getting started",
      href: `/${slug}/programs/new`,
    },
    {
      step: 2,
      label: "Configure reward",
      href: `/${slug}/programs/new/rewards`,
    },
    {
      step: 3,
      label: "Invite partners",
      href: `/${slug}/programs/new/partners`,
    },
    {
      step: 4,
      label: "Connect Dub",
      href: `/${slug}/programs/new/connect`,
    },
    {
      step: 5,
      label: "Overview",
      href: `/${slug}/programs/new/overview`,
      isLocked: true,
    },
  ];

  const currentStep = steps.find((s) => s.href === pathname)?.step || 1;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-[72px] z-20 rounded-md p-1 hover:bg-neutral-100 md:hidden"
      >
        <Menu className="h-5 w-5 text-neutral-600" />
      </button>

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
              {steps.map(({ step, label, href, isLocked }) => {
                const current = pathname === href;
                const completed = pathname !== href && step < currentStep;

                return (
                  <Link
                    key={step}
                    href={href}
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
                          "bg-neutral-200 text-neutral-600",
                        isLocked && "bg-neutral-200",
                      )}
                    >
                      {isLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : completed ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        step
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
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
