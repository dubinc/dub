"use client";

import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
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
  useMediaQuery,
} from "@dub/ui";
import { Download, Globe, TableIcon, Tag } from "@dub/ui/icons";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";

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

  const { LinkBuilder, CreateLinkButton } = useLinkBuilder();
  const { AddEditTagModal, setShowAddEditTagModal } = useAddEditTagModal();

  const { slug } = useWorkspace();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useLinkFilters();

  const { isValidating } = useLinks();

  return (
    <>
      <LinkBuilder />
      <AddEditTagModal />
      <div className="flex w-full items-center pt-3">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
            <div className="flex w-full grow gap-2 md:w-auto">
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
                        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3">
                          <Tag className="size-6 text-gray-700" />
                        </div>
                        <p className="mt-2 font-medium text-gray-950">
                          No tags found
                        </p>
                        <p className="mx-auto mt-1 w-full max-w-[180px] text-gray-700">
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
                        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-3">
                          <Globe className="size-6 text-gray-700" />
                        </div>
                        <p className="mt-2 font-medium text-gray-950">
                          No domains found
                        </p>
                        <p className="mx-auto mt-1 w-full max-w-[180px] text-gray-700">
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
              <div className="grow-0">
                <CreateLinkButton />
              </div>
              <MoreLinkOptions />
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
        <LinksContainer CreateLinkButton={CreateLinkButton} />
      </div>
    </>
  );
}

const MoreLinkOptions = () => {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [openPopover, setOpenPopover] = useState(false);
  const [state, setState] = useState<"default" | "import">("default");
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
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-gray-500">
                Import Links
              </p>
              <ImportOption
                onClick={() => {
                  setOpenPopover(false);
                  router.push(`/${slug}?import=bitly`);
                }}
                setOpenPopover={setOpenPopover}
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
                  router.push(`/${slug}?import=rebrandly`);
                }}
                setOpenPopover={setOpenPopover}
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
                  router.push(`/${slug}?import=short`);
                }}
                setOpenPopover={setOpenPopover}
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
                  router.push(`/${slug}?import=csv`);
                }}
                setOpenPopover={setOpenPopover}
              >
                <IconMenu
                  text="Import from CSV"
                  icon={<TableIcon className="size-4" />}
                />
              </ImportOption>
            </div>
            <div className="border-t border-gray-200" />
            <div className="grid gap-px p-2">
              <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-gray-500">
                Export Links
              </p>
              <button
                onClick={() => {
                  setOpenPopover(false);
                  setShowExportLinksModal(true);
                }}
                className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
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
          icon={<ThreeDots className="h-5 w-5 text-gray-500" />}
        />
      </Popover>
    </>
  );
};

function ImportOption({
  children,
  setOpenPopover,
  onClick,
}: {
  children: ReactNode;
  setOpenPopover: Dispatch<SetStateAction<boolean>>;
  onClick: () => void;
}) {
  const { slug, exceededLinks, nextPlan } = useWorkspace();

  return exceededLinks ? (
    <Tooltip
      content={
        <TooltipContent
          title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
          cta={`Upgrade to ${nextPlan.name}`}
          href={`/${slug}/upgrade`}
        />
      }
    >
      <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400 [&_img]:grayscale">
        {children}
      </div>
    </Tooltip>
  ) : (
    <button
      onClick={onClick}
      className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
    >
      {children}
    </button>
  );
}
