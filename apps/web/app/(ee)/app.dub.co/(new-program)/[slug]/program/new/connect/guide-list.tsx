"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@dub/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  guides,
  IntegrationGuide,
  IntegrationType,
} from "./integration-guides";

const sections: {
  type: IntegrationType;
  title: string;
  description: string;
}[] = [
  {
    type: "client-sdk",
    title: "Set up client-side script",
    description:
      "The step allows Dub to track clicks, automatically fetch the partner and discount data for a given link. Select the guide for instructions.",
  },
  {
    type: "server-sdk",
    title: "Set up server-side SDK",
    description:
      "Install the server-side SDK of your choice and select the guide for instructions.",
  },
  {
    type: "track-leads",
    title: "Track lead events",
    description:
      "The step allows your app to send lead events to Dub. Select the guide for instructions.",
  },
  {
    type: "track-sales",
    title: "Track sale events",
    description:
      "The step allows your app to send sale events to Dub. Select the guide for instructions.",
  },
];

export function GuideList() {
  const { slug: workspaceSlug } = useWorkspace();

  const [completedSections, setCompletedSections] = useState<
    Set<IntegrationType>
  >(new Set());

  const [openSections, setOpenSections] = useState<string[]>([
    sections[0].type,
  ]);

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

  const handleComplete = (sectionType: IntegrationType) => {
    setCompletedSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionType);
      return newSet;
    });

    const completedSectionIndex = sections.findIndex(
      (s) => s.type === sectionType,
    );

    setOpenSections((prevOpenSections) => {
      // close current section
      const newOpenSections = prevOpenSections.filter((s) => s !== sectionType);

      // open next section
      if (completedSectionIndex < sections.length - 1) {
        const nextSection = sections[completedSectionIndex + 1];
        newOpenSections.push(nextSection.type);
      }

      return newOpenSections;
    });
  };

  return (
    <div className="space-y-10">
      <Accordion
        type="multiple"
        className="w-full space-y-4"
        value={openSections}
        onValueChange={setOpenSections}
      >
        {sections.map((section, index) => {
          const isCompleted = completedSections.has(section.type);
          const isOpen = openSections.includes(section.type);

          return (
            <div
              key={section.type}
              className="overflow-hidden rounded-lg border border-neutral-200"
            >
              <AccordionItem
                key={section.type}
                value={section.type}
                className="border-none bg-white p-0"
              >
                <AccordionTrigger className="w-full rounded-none bg-neutral-100 px-4 py-2.5 text-left">
                  <div className="flex items-center gap-2">
                    {isCompleted && !isOpen ? (
                      <div className="flex size-5 items-center justify-center rounded-full bg-black text-white">
                        <Check className="size-3" />
                      </div>
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-full bg-white text-base font-semibold leading-6 text-neutral-900">
                        {index + 1}
                      </div>
                    )}
                    <h3 className="text-base font-semibold leading-6 text-neutral-900">
                      {section.title}
                    </h3>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="space-y-6 p-4">
                  <p className="text-sm font-medium leading-5 text-neutral-700">
                    {section.description}
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {(guidesByType[section.type] || []).map((guide) => (
                      <Link
                        prefetch={true}
                        href={`/${workspaceSlug}/program/new/connect?guide=${guide.key}`}
                        key={guide.title}
                        className="group relative flex h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg bg-neutral-100 px-2 py-4 text-center"
                      >
                        <div className="flex h-16 w-full items-center justify-center">
                          <guide.icon className="size-9" />
                        </div>
                        <div className="w-full text-sm font-semibold leading-5 text-neutral-900">
                          {guide.title}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col items-center justify-center space-y-3">
                    <Button
                      text="I've completed this"
                      className="rounded-lg"
                      onClick={() => handleComplete(section.type)}
                    />

                    {(section.type === "server-sdk" ||
                      section.type === "track-leads" ||
                      section.type === "track-sales") && (
                      <p className="text-center text-sm font-medium leading-5 text-neutral-500">
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
                </AccordionContent>
              </AccordionItem>
            </div>
          );
        })}
      </Accordion>

      <div className="flex items-center justify-between gap-4">
        <a
          href="https://dub.co/docs/partners/quickstart"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium leading-5 text-neutral-700 no-underline hover:underline"
        >
          View full documentation ↗
        </a>

        <Button
          text="I'll connect Dub later"
          className="h-8 w-fit rounded-lg"
          variant="secondary"
        />
      </div>
    </div>
  );
}
