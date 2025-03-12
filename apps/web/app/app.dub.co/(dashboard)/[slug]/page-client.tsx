"use client";

import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import { useIsMegaFolder } from "@/lib/swr/use-is-mega-folder";
import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { RequestFolderEditAccessButton } from "@/ui/folders/request-edit-button";
import LinkDisplay from "@/ui/links/link-display";
import LinksContainer from "@/ui/links/links-container";
import { LinksDisplayProvider } from "@/ui/links/links-display-provider";
import { useLinkFilters } from "@/ui/links/use-link-filters";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import { useExportLinksModal } from "@/ui/modals/export-links-modal";
import { useLinkBuilder } from "@/ui/modals/link-builder";
import { ThreeDots } from "@/ui/shared/icons";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  Button,
  Filter,
  IconMenu,
  MaxWidthWrapper,
  Popover,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { Download, Globe, TableIcon, Tag } from "@dub/ui/icons";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { ReactNode, useEffect, useState } from "react";

export default function WorkspaceLinksClient() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      posthog.identify(session.user["id"], {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session?.user]);

  return (
    <LinksDisplayProvider>
      <WorkspaceLinks />
    </LinksDisplayProvider>
  );
}

function WorkspaceLinks() {
  const router = useRouter();
  const { isValidating } = useLinks();
  const searchParams = useSearchParams();
  const { id: workspaceId, slug } = useWorkspace();
  const { LinkBuilder, CreateLinkButton } = useLinkBuilder();
  const { AddEditTagModal, setShowAddEditTagModal } = useAddEditTagModal();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useLinkFilters();

  const folderId = searchParams.get("folderId");
  const { isMegaFolder } = useIsMegaFolder();

  const { isLoading } = useFolderPermissions();
  const canCreateLinks = useCheckFolderPermission(
    folderId,
    "folders.links.write",
  );

  return (
    <>
      <LinkBuilder />
      <AddEditTagModal />
      <div className="flex w-full items-center pt-2">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
            <div className="flex w-full grow gap-2 md:w-auto">
              {!isMegaFolder && (
                <div className="grow basis-0 md:grow-0">
                  <Filter.Select
                    filters={filters}
                    activeFilters={activeFilters}
                    onSelect={onSelect}
                    onRemove={onRemove}
                    onSearchChange={setSearch}
                    onSelectedFilterChange={setSelectedFilter}
                    className="w-full"
                    emptyState={{
                      tagIds: (
                        <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">
                          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                            <Tag className="size-6 text-neutral-700" />
                          </div>
                          <p className="mt-2 font-medium text-neutral-950">
                            No tags found
                          </p>
                          <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">
                            Add tags to organize your links
                          </p>
                          <div>
                            <Button
                              className="mt-1 h-8"
                              onClick={() => setShowAddEditTagModal(true)}
                              text="Add tag"
                            />
                          </div>
                        </div>
                      ),
                      domain: (
                        <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">
                          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                            <Globe className="size-6 text-neutral-700" />
                          </div>
                          <p className="mt-2 font-medium text-neutral-950">
                            No domains found
                          </p>
                          <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">
                            Add a custom domain to match your brand
                          </p>
                          <div>
                            <Button
                              className="mt-1 h-8"
                              onClick={() =>
                                router.push(`/${slug}/settings/domains`)
                              }
                              text="Add domain"
                            />
                          </div>
                        </div>
                      ),
                    }}
                  />
                </div>
              )}
              <div className="grow basis-0 md:grow-0">
                <LinkDisplay />
              </div>
            </div>
            <div className="flex gap-x-2 max-md:w-full">
              <div className="w-full md:w-56 lg:w-64">
                <SearchBoxPersisted
                  loading={isValidating}
                  inputClassName="h-10"
                />
              </div>

              {isLoading ? (
                <div className="flex grow-0 animate-pulse items-center space-x-2">
                  <div className="h-10 w-24 rounded-md bg-neutral-200" />
                  <div className="h-10 w-10 rounded-md bg-neutral-200" />
                </div>
              ) : canCreateLinks ? (
                <>
                  <div className="hidden grow-0 sm:block">
                    <CreateLinkButton />
                  </div>
                  <MoreLinkOptions />
                </>
              ) : (
                <div className="w-fit">
                  <RequestFolderEditAccessButton
                    folderId={folderId!}
                    workspaceId={workspaceId!}
                    variant="primary"
                  />
                </div>
              )}
            </div>
          </div>
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </MaxWidthWrapper>
      </div>

      <div className="mt-3">
        <LinksContainer
          CreateLinkButton={canCreateLinks ? CreateLinkButton : () => <></>}
        />
      </div>
    </>
  );
}

const MoreLinkOptions = () => {
  const { queryParams } = useRouterStuff();
  const [openPopover, setOpenPopover] = useState(false);
  const [_state, setState] = useState<"default" | "import">("default");
  const { ExportLinksModal, setShowExportLinksModal } = useExportLinksModal();

  useEffect(() => {
    if (!openPopover) setState("default");
  }, [openPopover]);

  return (
    <>
      <ExportLinksModal />
      <Popover
        content={
          <div className="w-full md:w-52">
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Import Links
              </p>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  queryParams({
                    set: {
                      import: "bitly",
                    },
                  });
                }}
              >
                <IconMenu
                  text="Import from Bitly"
                  icon={
                    <img
                      src="https://assets.dub.co/misc/icons/bitly.svg"
                      alt="Bitly logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </ImportOption>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  queryParams({
                    set: {
                      import: "rebrandly",
                    },
                  });
                }}
              >
                <IconMenu
                  text="Import from Rebrandly"
                  icon={
                    <img
                      src="https://assets.dub.co/misc/icons/rebrandly.svg"
                      alt="Rebrandly logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </ImportOption>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  queryParams({
                    set: {
                      import: "short",
                    },
                  });
                }}
              >
                <IconMenu
                  text="Import from Short.io"
                  icon={
                    <img
                      src="https://assets.dub.co/misc/icons/short.svg"
                      alt="Short.io logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </ImportOption>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  queryParams({
                    set: {
                      import: "csv",
                    },
                  });
                }}
              >
                <IconMenu
                  text="Import from CSV"
                  icon={<TableIcon className="size-4" />}
                />
              </ImportOption>
            </div>
            <div className="border-t border-neutral-200" />
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                Export Links
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowExportLinksModal(true);
                }}
                className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
              >
                <IconMenu
                  text="Export as CSV"
                  icon={<Download className="h-4 w-4" />}
                />
              </button>
            </div>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
      >
        <Button
          onClick={() => setOpenPopover(!openPopover)}
          variant="secondary"
          className="w-auto px-1.5"
          icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
        />
      </Popover>
    </>
  );
};

function ImportOption({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  const { slug, exceededLinks, nextPlan } = useWorkspace();

  return exceededLinks ? (
    <Tooltip
      content={
        <TooltipContent
          title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
          cta={nextPlan ? `Upgrade to ${nextPlan.name}` : "Contact support"}
          href={`/${slug}/upgrade`}
        />
      }
    >
      <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-neutral-400 [&_img]:grayscale">
        {children}
      </div>
    </Tooltip>
  ) : (
    <button
      onClick={onClick}
      className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
    >
      {children}
    </button>
  );
}
