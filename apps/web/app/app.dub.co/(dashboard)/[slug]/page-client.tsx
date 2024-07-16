"use client";

import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import LinkDisplay from "@/ui/links/link-display";
import LinksContainer, { linkViewModes } from "@/ui/links/links-container";
import { useLinkFilters } from "@/ui/links/use-link-filters";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { useExportLinksModal } from "@/ui/modals/export-links-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  IconMenu,
  MaxWidthWrapper,
  Popover,
  Tooltip,
  TooltipContent,
  useLocalStorage,
  useRouterStuff,
} from "@dub/ui";
import { CloudUpload, Download } from "@dub/ui/src/icons";
import { Sheet } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";

export default function WorkspaceLinksClient() {
  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();

  const [viewMode, setViewMode] = useLocalStorage(
    "links-view-mode",
    linkViewModes[0],
  );

  useEffect(() => {
    if (!linkViewModes.includes(viewMode)) setViewMode("cards");
  }, [viewMode]);

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    useLinkFilters();

  const { isValidating } = useLinks();

  return (
    <>
      <AddEditLinkModal />
      <div className="mt-10 flex items-center pt-3">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap">
            <h1 className="order-1 text-2xl font-semibold tracking-tight text-black">
              Links
            </h1>
            <div className="order-4 flex grow flex-wrap justify-end gap-2 md:order-2">
              <div className="w-full md:w-72">
                <SearchBoxPersisted
                  loading={isValidating}
                  inputClassName="h-10"
                />
              </div>
              <div className="grow basis-0 md:grow-0">
                <Filter.Select
                  filters={filters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  className="w-full"
                />
              </div>
              <div className="grow basis-0 md:grow-0">
                <LinkDisplay
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>
            </div>
            <div className="order-3 flex gap-x-2">
              <div className="grow-0">
                <AddEditLinkButton />
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
        <LinksContainer
          AddEditLinkButton={AddEditLinkButton}
          viewMode={viewMode}
        />
      </div>
    </>
  );
}

const MoreLinkOptions = () => {
  const router = useRouter();
  const { slug } = useWorkspace();
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
          <AnimatedSizeContainer width height>
            <div className="w-full divide-y divide-gray-200 md:w-52">
              {state === "default" && (
                <div className="p-2">
                  <button
                    onClick={() => setState("import")}
                    className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <IconMenu
                      text="Import links"
                      icon={<CloudUpload className="h-4 w-4" />}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setOpenPopover(false);
                      setShowExportLinksModal(true);
                    }}
                    className="w-full rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <IconMenu
                      text="Export links"
                      icon={<Download className="h-4 w-4" />}
                    />
                  </button>
                </div>
              )}
              {state === "import" && (
                <>
                  <div className="p-2">
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
                            src="/_static/icons/bitly.svg"
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
                            src="/_static/icons/rebrandly.svg"
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
                            src="/_static/icons/short.svg"
                            alt="Short.io logo"
                            className="h-4 w-4"
                          />
                        }
                      />
                    </ImportOption>
                  </div>
                  <div className="p-2">
                    <Tooltip content="This feature is still in development – we'll let you know when it's ready!">
                      <div className="flex w-full cursor-not-allowed items-center justify-between space-x-2 rounded-md p-2 text-sm text-gray-400">
                        <IconMenu
                          text="Import from CSV"
                          icon={<Sheet className="h-4 w-4" />}
                        />
                      </div>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          </AnimatedSizeContainer>
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
  const { queryParams } = useRouterStuff();
  const { exceededLinks, nextPlan } = useWorkspace();

  return exceededLinks ? (
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
