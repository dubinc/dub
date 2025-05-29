"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context";
import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useQrs from "@/lib/swr/use-qrs.ts";
import useWorkspace from "@/lib/swr/use-workspace";
import { useExportLinksModal } from "@/ui/modals/export-links-modal";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import QrCodeSort from "@/ui/qr-code/qr-code-sort.tsx";
import QrCodesContainer from "@/ui/qr-code/qr-codes-container.tsx";
import { QrCodesDisplayProvider } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import { useQrCodeFilters } from "@/ui/qr-code/use-qr-code-filters.tsx";
import { ThreeDots } from "@/ui/shared/icons";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  Button,
  Filter,
  IconMenu,
  MaxWidthWrapper,
  Popover,
  Switch,
  Tooltip,
  TooltipContent,
} from "@dub/ui";
import { Download, ShieldAlert, TableIcon } from "@dub/ui/icons";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <QrCodesDisplayProvider>
      <WorkspaceLinks />
    </QrCodesDisplayProvider>
  );
}

function WorkspaceLinks() {
  const router = useRouter();
  const { isValidating } = useQrs();
  const searchParams = useSearchParams();
  const { slug } = useWorkspace();

  const { isTrialOver, setIsTrialOver } = useTrialStatus();

  const { filters, activeFilters, onRemove, onRemoveAll } = useQrCodeFilters();

  const folderId = searchParams.get("folderId");

  const { isLoading } = useFolderPermissions();
  const canCreateLinks = useCheckFolderPermission(
    folderId,
    "folders.links.write",
  );

  const { CreateQRButton, QRBuilderModal } = useQRBuilder();

  return (
    <>
      {/*<AddEditTagModal />*/}
      <QRBuilderModal />

      <div className="flex w-full items-center pt-2">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
          {/*@TODO: Remove toggle when trial logic is implemented*/}
          <div className="flex items-center justify-start gap-2">
            <span className="text-sm font-medium text-neutral-700">
              Trial Over:
            </span>
            <Switch checked={isTrialOver} fn={setIsTrialOver} />
          </div>
          {isTrialOver && (
            <div className="w-full rounded-lg border border-red-200 bg-red-100">
              <div className="px-3 py-3 md:px-4">
                <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-3">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      }}
                      className="flex items-center justify-center"
                    >
                      <ShieldAlert className="h-5 w-5 shrink-0 text-red-500 md:h-6 md:w-6" />
                    </motion.div>
                    <p className="text-center text-sm font-medium text-red-700 md:text-left">
                      Your dynamic QR codes are temporarily deactivated. To
                      restore them, please upgrade to one of our plans.
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full md:w-auto"
                  >
                    <Button
                      variant="primary"
                      className="bg-secondary hover:bg-secondary-800 w-full whitespace-nowrap text-sm font-medium text-white md:w-auto"
                      onClick={() => router.push(`/${slug}/plans`)}
                      text="Restore access"
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          )}
          {!isTrialOver && (
            <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
              <div className="flex w-full grow gap-2 md:w-auto">
                {/* @USEFUL_FEATURE: links table filters */}
                {/*<div className="grow basis-0 md:grow-0">*/}
                {/*  <Filter.Select*/}
                {/*    filters={filters}*/}
                {/*    activeFilters={activeFilters}*/}
                {/*    onSelect={onSelect}*/}
                {/*    onRemove={onRemove}*/}
                {/*    onSearchChange={setSearch}*/}
                {/*    onSelectedFilterChange={setSelectedFilter}*/}
                {/*    className="w-full"*/}
                {/*    emptyState={{*/}
                {/*      tagIds: (*/}
                {/*        <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">*/}
                {/*          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">*/}
                {/*            <Tag className="size-6 text-neutral-700" />*/}
                {/*          </div>*/}
                {/*          <p className="mt-2 font-medium text-neutral-950">*/}
                {/*            No tags found*/}
                {/*          </p>*/}
                {/*          <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">*/}
                {/*            Add tags to organize your links*/}
                {/*          </p>*/}
                {/*          <div>*/}
                {/*            <Button*/}
                {/*              className="mt-1 h-8"*/}
                {/*              onClick={() => setShowAddEditTagModal(true)}*/}
                {/*              text="Add tag"*/}
                {/*            />*/}
                {/*          </div>*/}
                {/*        </div>*/}
                {/*      ),*/}
                {/*      domain: (*/}
                {/*        <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">*/}
                {/*          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">*/}
                {/*            <Globe className="size-6 text-neutral-700" />*/}
                {/*          </div>*/}
                {/*          <p className="mt-2 font-medium text-neutral-950">*/}
                {/*            No domains found*/}
                {/*          </p>*/}
                {/*          <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">*/}
                {/*            Add a custom domain to match your brand*/}
                {/*          </p>*/}
                {/*          <div>*/}
                {/*            <Button*/}
                {/*              className="mt-1 h-8"*/}
                {/*              onClick={() =>*/}
                {/*                router.push(`/${slug}/settings/domains`)*/}
                {/*              }*/}
                {/*              text="Add domain"*/}
                {/*            />*/}
                {/*          </div>*/}
                {/*        </div>*/}
                {/*      ),*/}
                {/*    }}*/}
                {/*  />*/}
                {/*</div>*/}
                {/* @USEFUL_FEATURE: link table display settings */}
                {/*<div className="grow basis-0 md:grow-0">*/}
                {/*  <LinkDisplay />*/}
                {/*</div>*/}
                <div className="grow basis-0 md:grow-0">
                  <QrCodeSort />
                </div>
              </div>
              <div className="flex gap-x-2 max-md:w-full">
                <div className="w-full md:w-56 lg:w-64">
                  <SearchBoxPersisted
                    loading={isValidating}
                    inputClassName="h-10"
                  />
                </div>

                {
                  isLoading ? (
                    <div className="flex grow-0 animate-pulse items-center space-x-2">
                      <div className="h-10 w-24 rounded-md bg-neutral-200" />
                      <div className="h-10 w-10 rounded-md bg-neutral-200" />
                    </div>
                  ) : canCreateLinks ? (
                    <>
                      <div className="grow-0">
                        <CreateQRButton />
                      </div>
                      {/* @USEFUL_FEATURE: more links next to Create QR button */}
                      {/*<MoreLinkOptions />*/}
                    </>
                  ) : null
                  // (
                  //     <div className="w-fit">
                  //       <RequestFolderEditAccessButton
                  //           folderId={folderId!}
                  //           workspaceId={workspaceId!}
                  //           variant="primary"
                  //       />
                  //     </div>
                  // )
                }
              </div>
            </div>
          )}
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </MaxWidthWrapper>
      </div>

      <div className="mt-3">
        <QrCodesContainer
          CreateQrCodeButton={
            canCreateLinks && !isTrialOver ? CreateQRButton : () => <></>
          }
          isTrialOver={isTrialOver}
        />
      </div>
    </>
  );
}

const MoreLinkOptions = () => {
  const router = useRouter();
  const { slug } = useWorkspace();
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
