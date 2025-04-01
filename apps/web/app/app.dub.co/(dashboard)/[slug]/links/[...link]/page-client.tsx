"use client";

import useLink from "@/lib/swr/use-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { LinkBuilderDestinationUrlInput } from "@/ui/links/link-builder/controls/link-builder-destination-url-input";
import { LinkBuilderShortLinkInput } from "@/ui/links/link-builder/controls/link-builder-short-link-input";
import { LinkCommentsInput } from "@/ui/links/link-builder/controls/link-comments-input";
import { LinkBuilderHeader } from "@/ui/links/link-builder/link-builder-header";
import {
  LinkBuilderProvider,
  LinkFormData,
} from "@/ui/links/link-builder/link-builder-provider";
import { useLinkBuilderSubmit } from "@/ui/links/link-builder/use-link-builder-submit";
import { ConversionTrackingToggle } from "@/ui/modals/link-builder/conversion-tracking-toggle";
import {
  DraftControls,
  DraftControlsHandle,
} from "@/ui/modals/link-builder/draft-controls";
import { OptionsList } from "@/ui/modals/link-builder/options-list";
import { TagSelect } from "@/ui/modals/link-builder/tag-select";
import { cn } from "@dub/utils";
import { useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";

export function LinkPageClient({
  domain,
  slug,
}: {
  domain: string;
  slug: string;
}) {
  const workspace = useWorkspace();

  const { link } = useLink({
    domain,
    slug,
  });

  return link ? (
    <LinkBuilderProvider props={link} workspace={workspace}>
      <LinkBuilder link={link} />
    </LinkBuilderProvider>
  ) : (
    <div>Loading...</div>
  );
}

function LinkBuilder({ link }: { link: ExpandedLinkProps }) {
  const workspace = useWorkspace();

  const { handleSubmit } = useFormContext<LinkFormData>();

  const draftControlsRef = useRef<DraftControlsHandle>(null);

  const onSubmitSuccess = useCallback(() => {
    draftControlsRef.current?.onSubmitSuccessful();
  }, []);

  const onSubmit = useLinkBuilderSubmit({
    onSuccess: onSubmitSuccess,
  });

  return (
    <div className="flex min-h-[calc(100vh-8px)] flex-col rounded-t-[inherit] bg-white">
      <div className="py-2 pl-4 pr-5">
        <LinkBuilderHeader
          className="p-0"
          foldersEnabled={!!workspace.flags?.linkFolders}
        >
          <DraftControls
            ref={draftControlsRef}
            props={link}
            workspaceId={workspace.id!}
          />
        </LinkBuilderHeader>
      </div>
      <form
        className={cn(
          "grid grow grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]",
          "divide-y divide-neutral-200 border-t border-neutral-200 lg:divide-x lg:divide-y-0",
        )}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="scrollbar-hide px-4 md:overflow-auto md:px-6">
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 py-10">
            <LinkBuilderDestinationUrlInput />

            <LinkBuilderShortLinkInput />

            <TagSelect />

            <LinkCommentsInput />

            <ConversionTrackingToggle />

            <div className="flex grow flex-col justify-end">
              <OptionsList />
            </div>
          </div>
        </div>
        <div className="bg-neutral-50">
          WIP
          <div className="h-96 w-4 border border-red-500" />
        </div>
      </form>
    </div>
  );
}
