"use client";

import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { usePageContext } from "./page-context.tsx";

export const StepNavigation = () => {
  const { isMobile } = useMediaQuery();
  const { currentStep, steps } = usePageContext();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();

  const type = searchParams.get("type");
  const contentDone = searchParams.get("content");

  return (
    <NavigationMenu.Root className="flex items-center gap-2">
      {Object.entries(steps).map(([key, step]) => {
        const isPreviousStep = step.step < currentStep;
        const isActive = step.step === currentStep;
        const Icon = step.icon;
        const showLabel = isMobile ? isActive : true;

        const isStepAllowed =
          step.step === 1 ||
          (step.step === 2 && !!type) ||
          (step.step === 3 && !!type && !!contentDone);

        const queryString = searchParams.toString();
        const href = isStepAllowed
          ? `/${slug}/${step.href}${queryString ? `?${queryString}` : ""}`
          : "#";

        return (
          <NavigationMenu.List
            key={step.step}
            className="flex items-center gap-1 md:gap-2"
          >
            <NavigationMenu.Item>
              <Link href={href} isActive={isActive}>
                {isPreviousStep ? (
                  <SelectedStep className="text-primary" />
                ) : (
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive
                        ? "fill-primary [&_path:first-child]:stroke-primary text-white"
                        : "text-neutral-200 [&_path:first-child]:stroke-neutral-200",
                    )}
                  />
                )}
                {showLabel && <span>{step.title}</span>}
              </Link>
            </NavigationMenu.Item>
            {step.step < Object.entries(steps).length && (
              <span className="text-gray-400">
                <ChevronDown className="size-3 -rotate-90 text-neutral-200 md:size-4" />
              </span>
            )}
          </NavigationMenu.List>
        );
      })}
    </NavigationMenu.Root>
  );
};

import SelectedStep from "@/ui/shared/icons/qr-creation-steps/selected-step.tsx";
import NextLink from "next/link";
import { ReactNode } from "react";

interface ILinkProps {
  href: string;
  isActive: boolean;
  children: ReactNode;
}

const Link = ({ href, isActive, children, ...props }: ILinkProps) => {
  return (
    <NavigationMenu.Link asChild active={isActive}>
      <NextLink
        href={href}
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border border-transparent px-2 py-[6px] text-xs font-normal md:h-9 md:min-w-[121px] md:cursor-pointer md:px-3 md:py-2 md:text-sm",
          isActive
            ? "border-primary bg-primary-300 text-neutral font-medium"
            : "bg-primary-200",
        )}
        {...props}
      >
        {children}
      </NextLink>
    </NavigationMenu.Link>
  );
};
