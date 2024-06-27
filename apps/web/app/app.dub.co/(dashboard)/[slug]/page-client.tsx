"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SearchBox } from "@/ui/links/link-filters";
import LinkSort from "@/ui/links/link-sort";
import LinksContainer from "@/ui/links/links-container";
import { useLinkFilters } from "@/ui/links/use-link-filters";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Filter,
  IconMenu,
  MaxWidthWrapper,
  Popover,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { FilePlus2, Sheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

export default function WorkspaceLinksClient() {
  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useLinkFilters();

  return (
    <>
      <AddEditLinkModal />
      <div className="mt-10 flex items-center pt-3">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Links
            </h1>
            <div className="flex space-x-2">
              <div className="w-72 max-w-full">
                <SearchBox />
              </div>
              <Filter.Select
                filters={filters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <div className="grow-0">
                <Suspense>
                  <LinkSort />
                </Suspense>
              </div>
              <div className="grow-0">
                <AddEditLinkButton />
              </div>
              <AddLinkOptions />
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
        <LinksContainer AddEditLinkButton={AddEditLinkButton} />
      </div>
    </>
  );
}

const AddLinkOptions = () => {
  const router = useRouter();
  const { slug, nextPlan, exceededLinks } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { queryParams } = useRouterStuff();

  return (
    <Popover
      content={
        <div className="w-full divide-y divide-gray-200 md:w-52">
          <div className="p-2">
            {exceededLinks ? (
              <Tooltip
                content={
                  <TooltipContent
                    title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
                    cta={`Upgrade to ${nextPlan.name}`}
                    onClick={() => {
                      setOpenPopover(false);
                      queryParams({
                        set: {
                          upgrade: nextPlan.name.toLowerCase(),
                        },
                      });
                    }}
                  />
                }
              >
                <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                  <IconMenu
                    text="Import from Bitly"
                    icon={
                      <img
                        src="/_static/icons/bitly.svg"
                        alt="Bitly logo"
                        className="h-4 w-4 rounded-full grayscale"
                      />
                    }
                  />
                </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => {
                  setOpenPopover(false);
                  router.push(`/${slug}?import=bitly`);
                }}
                className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
              >
                <IconMenu
                  text="Import from Bitly"
                  icon={
                    <img
                      src="/_static/icons/bitly.svg"
                      alt="Bitly logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </button>
            )}
            {exceededLinks ? (
              <Tooltip
                content={
                  <TooltipContent
                    title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
                    cta={`Upgrade to ${nextPlan.name}`}
                    onClick={() => {
                      setOpenPopover(false);
                      queryParams({
                        set: {
                          upgrade: nextPlan.name.toLowerCase(),
                        },
                      });
                    }}
                  />
                }
              >
                <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                  <IconMenu
                    text="Import from Rebrandly"
                    icon={
                      <img
                        src="/_static/icons/rebrandly.svg"
                        alt="Rebrandly logo"
                        className="h-4 w-4 grayscale"
                      />
                    }
                  />
                </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => {
                  setOpenPopover(false);
                  router.push(`/${slug}?import=rebrandly`);
                }}
                className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
              >
                <IconMenu
                  text="Import from Rebrandly"
                  icon={
                    <img
                      src="/_static/icons/rebrandly.svg"
                      alt="Rebrandly logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </button>
            )}
            {exceededLinks ? (
              <Tooltip
                content={
                  <TooltipContent
                    title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
                    cta={`Upgrade to ${nextPlan.name}`}
                    onClick={() => {
                      setOpenPopover(false);
                      queryParams({
                        set: {
                          upgrade: nextPlan.name.toLowerCase(),
                        },
                      });
                    }}
                  />
                }
              >
                <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                  <IconMenu
                    text="Import from Short.io"
                    icon={
                      <img
                        src="/_static/icons/short.svg"
                        alt="Short.io logo"
                        className="h-4 w-4 grayscale"
                      />
                    }
                  />
                </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => {
                  setOpenPopover(false);
                  router.push(`/${slug}?import=short`);
                }}
                className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
              >
                <IconMenu
                  text="Import from Short.io"
                  icon={
                    <img
                      src="/_static/icons/short.svg"
                      alt="Short.io logo"
                      className="h-4 w-4"
                    />
                  }
                />
              </button>
            )}
            <Tooltip content="This feature is still in development – we'll let you know when it's ready!">
              <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                <IconMenu
                  text="Import from CSV"
                  icon={<Sheet className="h-4 w-4" />}
                />
              </div>
            </Tooltip>
          </div>
          <div className="p-2">
            <Tooltip content="This feature is still in development – we'll let you know when it's ready!">
              <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                <IconMenu
                  text="Bulk create links"
                  icon={<FilePlus2 className="h-4 w-4" />}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="end"
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "flex h-10 items-center rounded-md border px-1.5 outline-none transition-all",
          "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
          "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
        )}
      >
        <ThreeDots className="h-5 w-5 text-gray-500" />
      </button>
    </Popover>
  );
};
