"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LinksContainer from "@/ui/links/links-container";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import {
  IconMenu,
  MaxWidthWrapper,
  Popover,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { ChevronDown, FilePlus2, Sheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkspaceLinksClient() {
  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  return (
    <>
      <AddEditLinkModal />
      <div className="mt-10 flex items-center">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between py-3">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Links
            </h1>
            <div className="flex">
              <AddEditLinkButton />
              <AddLinkOptions />
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
      <LinksContainer AddEditLinkButton={AddEditLinkButton} />
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
        className="group ml-2 flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white p-2.5 shadow transition-all duration-75"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 ${
            openPopover ? "rotate-180 text-gray-700" : "text-gray-400"
          } transition-all group-hover:text-gray-700`}
        />
      </button>
    </Popover>
  );
};
