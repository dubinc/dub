"use client";

import useLink from "@/lib/swr/use-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { ExpandedLinkProps } from "@/lib/types";
import LayoutLoader from "@/ui/layout/layout-loader";
import { LinkAnalyticsBadge } from "@/ui/links/link-analytics-badge";
import { LinkBuilderDestinationUrlInput } from "@/ui/links/link-builder/controls/link-builder-destination-url-input";
import { LinkBuilderShortLinkInput } from "@/ui/links/link-builder/controls/link-builder-short-link-input";
import { LinkCommentsInput } from "@/ui/links/link-builder/controls/link-comments-input";
import { ConversionTrackingToggle } from "@/ui/links/link-builder/conversion-tracking-toggle";
import {
  DraftControls,
  DraftControlsHandle,
} from "@/ui/links/link-builder/draft-controls";
import { LinkActionBar } from "@/ui/links/link-builder/link-action-bar";
import { LinkBuilderHeader } from "@/ui/links/link-builder/link-builder-header";
import {
  LinkBuilderProvider,
  LinkFormData,
} from "@/ui/links/link-builder/link-builder-provider";
import { LinkFeatureButtons } from "@/ui/links/link-builder/link-feature-buttons";
import { LinkPreview } from "@/ui/links/link-builder/link-preview";
import { OptionsList } from "@/ui/links/link-builder/options-list";
import { QRCodePreview } from "@/ui/links/link-builder/qr-code-preview";
import { TagSelect } from "@/ui/links/link-builder/tag-select";
import { useLinkBuilderSubmit } from "@/ui/links/link-builder/use-link-builder-submit";
import { useMetatags } from "@/ui/links/link-builder/use-metatags";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFormContext, useFormState } from "react-hook-form";

export function LinkPageClient() {
  const params = useParams<{ link: string | string[] }>();

  const linkParts = Array.isArray(params.link) ? params.link : null;
  if (!linkParts) notFound();

  const domain = linkParts[0];
  const slug = linkParts.length > 1 ? linkParts.slice(1).join("/") : "_root";

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
    <LayoutLoader />
  );
}

function LinkBuilder({ link }: { link: ExpandedLinkProps }) {
  const router = useRouter();
  const workspace = useWorkspace();

  const { isDesktop } = useMediaQuery();

  const { control, handleSubmit, reset, getValues } =
    useFormContext<LinkFormData>();
  const { isSubmitSuccessful } = useFormState({ control });

  const draftControlsRef = useRef<DraftControlsHandle>(null);

  const onSubmitSuccess = (data: LinkFormData) => {
    draftControlsRef.current?.onSubmitSuccessful();

    router.replace(`/${workspace.slug}/links/${data.domain}/${data.key}`, {
      scroll: false,
    });
  };

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
          <div className="flex min-w-0 items-center gap-2">
            <DraftControls
              ref={draftControlsRef}
              props={link}
              workspaceId={workspace.id!}
            />
            <div className="shrink-0">
              <LinkAnalyticsBadge link={link} />
            </div>
          </div>
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
