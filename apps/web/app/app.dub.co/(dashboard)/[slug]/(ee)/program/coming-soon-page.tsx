"use client";

import { Badge } from "@dub/ui";
import { ReactNode } from "react";

export function ComingSoonPage({
  title,
  description,
  graphic,
  ctas,
}: {
  title: string;
  description: ReactNode;
  graphic: ReactNode;
  ctas?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-5 overflow-hidden px-4 py-10">
      {graphic}
      <Badge variant="blueGradient" className="py-1">
        Coming soon
      </Badge>
      <div className="max-w-[400px] text-pretty text-center">
        <span className="text-base font-medium text-neutral-900">{title}</span>
        <p className="mt-2 text-pretty text-sm text-neutral-500">
          {description}
        </p>
      </div>
      {ctas && <div className="flex items-center gap-2">{ctas}</div>}
    </div>
  );
}
