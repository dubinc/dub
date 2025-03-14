"use client";

import useProgramResources from "@/lib/swr/use-program-resources";
import { ResourceCard } from "@/ui/partners/resources/resource-card";
import { ResourceSection } from "@/ui/partners/resources/resource-section";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { FileContent, FileZip2, Palette2, Post } from "@dub/ui/icons";
import { formatFileSize } from "@dub/utils";
import { useParams } from "next/navigation";

const emptyStateIcons = [Post, Palette2, FileZip2];

export function ResourcesPageClient() {
  const { programSlug } = useParams();

  const { resources, isLoading, isValidating } = useProgramResources({
    programId: programSlug as string,
  });

  const isEmpty =
    !isLoading &&
    ["logos", "colors", "files"].every(
      (resource) => !resources?.[resource]?.length,
    );

  return (
    <MaxWidthWrapper>
      {isLoading || !isEmpty ? (
        <div className="flex flex-col gap-10">
          {(isLoading || !!resources?.logos?.length) && (
            <ResourceSection
              resource="logo"
              title="Brand logos"
              isLoading={isLoading}
              isValidating={isValidating}
            >
              {resources?.logos?.map((logo) => (
                <ResourceCard
                  key={logo.id}
                  resourceType="logo"
                  icon={
                    <div className="relative size-8 overflow-hidden">
                      <img
                        src={logo.url}
                        alt="thumbnail"
                        className="size-full object-contain"
                      />
                    </div>
                  }
                  title={logo.name || "Logo"}
                  description={formatFileSize(logo.size, 0)}
                  downloadUrl={logo.url}
                />
              ))}
            </ResourceSection>
          )}
          {(isLoading || !!resources?.colors?.length) && (
            <ResourceSection
              resource="color"
              title="Colors"
              isLoading={isLoading}
              isValidating={isValidating}
            >
              {resources?.colors?.map((color) => (
                <ResourceCard
                  key={color.id}
                  resourceType="color"
                  icon={
                    <div
                      className="size-full"
                      style={{ backgroundColor: color.color }}
                    />
                  }
                  title={color.name || "Color"}
                  description={color.color.toUpperCase()}
                  copyText={color.color.toUpperCase()}
                />
              ))}
            </ResourceSection>
          )}
          {(isLoading || !!resources?.files?.length) && (
            <ResourceSection
              resource="file"
              title="Additional files"
              isLoading={isLoading}
              isValidating={isValidating}
            >
              {resources?.files?.map((file) => (
                <ResourceCard
                  key={file.id}
                  resourceType="file"
                  icon={
                    <div className="flex size-full items-center justify-center bg-neutral-50">
                      <FileContent className="size-4 text-neutral-800" />
                    </div>
                  }
                  title={file.name || "File"}
                  description={formatFileSize(file.size, 0)}
                  downloadUrl={file.url}
                />
              ))}
            </ResourceSection>
          )}
        </div>
      ) : (
        <AnimatedEmptyState
          title="Resources"
          description="When this program adds resources, they'll appear here"
          cardContent={(idx) => {
            const Icon = emptyStateIcons[idx % emptyStateIcons.length];
            return (
              <>
                <Icon className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              </>
            );
          }}
        />
      )}
    </MaxWidthWrapper>
  );
}
