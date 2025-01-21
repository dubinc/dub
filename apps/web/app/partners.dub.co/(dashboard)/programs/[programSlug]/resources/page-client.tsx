"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { FileZip2, Palette2, Post } from "@dub/ui/icons";

const emptyStateIcons = [Post, Palette2, FileZip2];

export function ResourcesPageClient() {
  return (
    <MaxWidthWrapper>
      <AnimatedEmptyState
        title="Resources"
        description="Partner guides and materials to boost promotion and earnings"
        cardContent={(idx) => {
          const Icon = emptyStateIcons[idx % emptyStateIcons.length];
          return (
            <>
              <Icon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          );
        }}
        pillContent="Coming soon"
      />
    </MaxWidthWrapper>
  );
}
