"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { Button, useRouterStuff } from "@dub/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  guides,
  IntegrationGuide,
  IntegrationType,
  sections,
} from "./integrations";

const guidesByType = guides.reduce(
  (acc, guide) => {
    if (!acc[guide.type]) {
      acc[guide.type] = [];
    }
    acc[guide.type].push(guide);
    return acc;
  },
  {} as Record<IntegrationType, IntegrationGuide[]>,
);

export function GuideList() {
  const pathname = usePathname();
  const { router, searchParams, queryParams } = useRouterStuff();
  const { slug: workspaceSlug } = useWorkspace();

  const currentStep = searchParams.get("step") ?? sections[0].type;

  const showConnectLaterButton = pathname.includes("/program/new/connect");

  return (
    <div>
      <ProgramSheetAccordion
        type="single"
        collapsible
        value={currentStep}
        onValueChange={(value) => {
          queryParams({
            set: {
              step: value || "none",
            },
            scroll: false,
          });
        }}
        className="space-y-4"
      >
        {sections.map((section, index) => (
          <ProgramSheetAccordionItem key={section.type} value={section.type}>
            <ProgramSheetAccordionTrigger className="bg-neutral-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-white text-sm font-semibold leading-6 text-neutral-900">
                  {index + 1}
                </div>

                <h3 className="text-base font-semibold leading-6 text-neutral-900">
                  {section.title}
                </h3>
              </div>
            </ProgramSheetAccordionTrigger>

            <ProgramSheetAccordionContent>
              <div className="space-y-6">
                <p className="text-sm font-medium text-neutral-600">
                  {section.description}
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {(guidesByType[section.type] || []).map((guide) => (
                    <Link
                      key={guide.title}
                      href={`${pathname}/${guide.key}`}
                      className="group relative flex h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg bg-neutral-100 px-2 py-4 text-center transition-colors hover:bg-neutral-200/75"
                    >
                      {guide.recommended && (
                        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
                          <div className="relative">
                            <div className="rotate-1 transform rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                              Recommended
                            </div>
                            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 transform bg-gradient-to-r from-blue-500 to-purple-600"></div>
                          </div>
                        </div>
                      )}

                      <div className="flex h-16 w-full items-center justify-center">
                        <guide.icon className="size-10" />
                      </div>

                      <div>
                        <div className="w-full text-sm font-semibold leading-5 text-neutral-900">
                          {guide.title}
                        </div>

                        {guide.subtitle && (
                          <div className="w-full text-sm font-medium leading-5 text-neutral-500">
                            {guide.subtitle}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center space-y-3">
                  <Button
                    text="I've completed this"
                    className="rounded-lg"
                    onClick={() => {
                      if (sections.length - 1 === index) {
                        router.push(
                          showConnectLaterButton
                            ? `/${workspaceSlug}/program/new/overview`
                            : `/${workspaceSlug}/customers`,
                        );
                        return;
                      }
                      queryParams({
                        set: {
                          step: sections[index + 1].type,
                        },
                        scroll: false,
                      });
                    }}
                  />

                  {["track-lead", "track-sale"].includes(section.type) && (
                    <p className="flex items-center justify-center gap-2 text-center text-sm font-medium leading-5 text-neutral-500">
                      <Shopify className="inline size-4" />
                      If you're using Shopify, you can skip this step.{" "}
                      <Link
                        href="https://dub.co/docs/conversions/sales/shopify"
                        className="text-neutral-500 underline underline-offset-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read the guide.
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </ProgramSheetAccordionContent>
          </ProgramSheetAccordionItem>
        ))}
      </ProgramSheetAccordion>

      {showConnectLaterButton && (
        <div className="mt-6 flex items-center justify-end gap-4">
          <Link href={`/${workspaceSlug}/program/new/overview`}>
            <Button
              text="I'll set up conversion tracking later"
              className="h-8 w-fit rounded-lg"
              variant="secondary"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
