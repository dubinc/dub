"use client";

import useProgramResources from "@/lib/swr/use-program-resources";
import { Button } from "@dub/ui";
import { formatFileSize } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";

export function ProgramResourcesPageClient() {
  const { resources, loading } = useProgramResources();

  return (
    <div className="flex flex-col gap-10">
      <Section
        resource="logo"
        title="Brand logos"
        description="SVG, JPG, or PNG, max size of 10 MB"
      >
        {resources?.logos?.map((logo) => (
          <ResourceCard
            key={logo.id}
            icon={<div />}
            title={logo.name}
            description={formatFileSize(logo.size)}
          />
        ))}
      </Section>
      <Section
        resource="color"
        title="Colors"
        description="Provide affiliates with official colors"
      ></Section>
      <Section
        resource="file"
        title="Additional files"
        description="Any document file format, max size 10 MB"
      ></Section>
    </div>
  );
}

function Section({
  resource,
  title,
  description,
  children,
}: PropsWithChildren<{
  resource: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="grid grid-cols-1 rounded-lg border border-neutral-200 p-6 sm:grid-cols-2">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      <div className="flex flex-col items-end gap-4">
        {children}
        <Button
          type="button"
          text={`Add ${resource}`}
          onClick={() => alert("WIP")}
          className="h-8 w-fit px-3"
        />
      </div>
    </div>
  );
}

function ResourceCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-neutral-200">
      <div className="flex items-center gap-4">
        <div className="flex size-10 rounded-md border border-neutral-200">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-800">{title}</span>
          <span className="text-xs text-neutral-500">{description}</span>
        </div>
      </div>
      {/* TODO: Menu button */}
    </div>
  );
}
