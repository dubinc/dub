"use client";

import useLink from "@/lib/swr/use-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import { LinkBuilderDestinationUrlInput } from "@/ui/links/link-builder/controls/link-builder-destination-url-input";
import { LinkBuilderShortLinkInput } from "@/ui/links/link-builder/controls/link-builder-short-link-input";
import { LinkCommentsInput } from "@/ui/links/link-builder/controls/link-comments-input";
import { LinkActionBar } from "@/ui/links/link-builder/link-action-bar";
import { LinkBuilderHeader } from "@/ui/links/link-builder/link-builder-header";
import {
  LinkBuilderProvider,
  LinkFormData,
} from "@/ui/links/link-builder/link-builder-provider";
import { LinkFeatureButtons } from "@/ui/links/link-builder/link-feature-buttons";
import { useLinkBuilderSubmit } from "@/ui/links/link-builder/use-link-builder-submit";
import { ConversionTrackingToggle } from "@/ui/modals/link-builder/conversion-tracking-toggle";
import {
  DraftControls,
  DraftControlsHandle,
} from "@/ui/modals/link-builder/draft-controls";
import { LinkPreview } from "@/ui/modals/link-builder/link-preview";
import { OptionsList } from "@/ui/modals/link-builder/options-list";
import { QRCodePreview } from "@/ui/modals/link-builder/qr-code-preview";
import { TagSelect } from "@/ui/modals/link-builder/tag-select";
import { useMetatags } from "@/ui/modals/link-builder/use-metatags";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useEffect, useRef } from "react";
import { useFormContext, useFormState } from "react-hook-form";

export function LinkPageClient({
  domain,
  slug,
}: {
  domain: string;
  slug: string;
}) {
  const workspace = useWorkspace();

  const { link } = useLink(
    {
      domain,
      slug,
    },
    {
      keepPreviousData: true,
    },
  );

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

  const { isDesktop } = useMediaQuery();

  const { control, handleSubmit, reset, getValues } =
    useFormContext<LinkFormData>();
  const { isSubmitSuccessful } = useFormState({ control });

  const draftControlsRef = useRef<DraftControlsHandle>(null);

  const onSubmitSuccess = useCallback(() => {
    draftControlsRef.current?.onSubmitSuccessful();
  }, []);

  useEffect(() => {
    if (isSubmitSuccessful)
      reset(getValues(), { keepValues: true, keepDirty: false });
  }, [isSubmitSuccessful, reset, getValues]);

  const onSubmit = useLinkBuilderSubmit({
    onSuccess: onSubmitSuccess,
  });

  useMetatags();

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
          "divide-neutral-200 border-t border-neutral-200 lg:divide-x lg:divide-y lg:divide-y-0",
        )}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="relative flex min-h-full flex-col px-4 md:px-6">
          <div className="relative mx-auto flex w-full max-w-xl flex-col gap-7 pb-4 pt-10 lg:pb-10">
            <LinkBuilderDestinationUrlInput />

            <LinkBuilderShortLinkInput />

            <TagSelect />

            <LinkCommentsInput />

            <ConversionTrackingToggle />

            {isDesktop && (
              <LinkFeatureButtons className="mt-1 flex-wrap" variant="page" />
            )}

            <OptionsList />
          </div>

          {isDesktop && (
            <>
              <div className="grow" />
              <LinkActionBar />
            </>
          )}
        </div>
        <div className="px-4 md:px-6 lg:bg-neutral-50 lg:px-0">
          <div className="divide-nxeutral-200 mx-auto max-w-xl lg:divide-y">
            <div className="py-4 lg:px-4 lg:py-6">
              <QRCodePreview />
            </div>
            <div className="py-4 lg:px-4 lg:py-6">
              <LinkPreview />
            </div>
          </div>
        </div>
        {!isDesktop && (
          <LinkActionBar>
            <LinkFeatureButtons variant="page" />
          </LinkActionBar>
        )}
      </form>
    </div>
  );
}
