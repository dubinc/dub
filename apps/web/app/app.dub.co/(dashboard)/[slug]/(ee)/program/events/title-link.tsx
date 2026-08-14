"use client";

import { ChevronRight } from "@dub/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProgramEventsPageTitleLink() {
  const { slug } = useParams();
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/${slug}/program/analytics`}
        className="transition-all duration-150 hover:text-neutral-600 active:scale-95"
      >
        Analytics
      </Link>
      <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
      Events
    </div>
  );
}
