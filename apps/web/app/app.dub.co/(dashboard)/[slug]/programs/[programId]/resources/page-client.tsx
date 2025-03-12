"use client";

import { Button } from "@dub/ui";
import { PropsWithChildren } from "react";

export function ProgramResourcesPageClient() {
  return (
    <div className="flex flex-col gap-10">
      <Section
        resource="logo"
        title="Brand logos"
        description="SVG, JPG, or PNG, max size of 10 MB"
      ></Section>
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
