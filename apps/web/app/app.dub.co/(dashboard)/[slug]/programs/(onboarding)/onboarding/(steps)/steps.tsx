"use client";

import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export function Steps() {
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
      href: `/${slug}/programs/onboarding/new`,
    },
    {
      step: 2,
      label: "Configure reward",
      href: `/${slug}/programs/onboarding/rewards`,
    },
    {
      step: 3,
      label: "Invite partners",
      href: `/${slug}/programs/onboarding/partners`,
    },
    {
      step: 4,
      label: "Connect Dub",
      href: `/${slug}/programs/onboarding/connect`,
    },
    {
      step: 5,
      label: "Overview",
      href: `/${slug}/programs/onboarding/overview`,
    },
  ];

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
              {steps.map(({ step, label, href }) => (
                <Link
                  key={step}
                  href={href}
                  className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
                    {step}
                  </div>
                  <span className="text-sm font-medium text-neutral-600">
                    {label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
