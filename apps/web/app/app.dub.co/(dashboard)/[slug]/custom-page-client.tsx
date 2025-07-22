"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context";
import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useQrs from "@/lib/swr/use-qrs.ts";
import useWorkspace from "@/lib/swr/use-workspace";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import { preloadAllFrames } from "@/ui/qr-builder/constants/customization/frames.ts";
import QrCodeSort from "@/ui/qr-code/qr-code-sort.tsx";
import QrCodesContainer from "@/ui/qr-code/qr-codes-container.tsx";
import { QrCodesDisplayProvider } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import { useQrCodeFilters } from "@/ui/qr-code/use-qr-code-filters.tsx";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { Button, Filter, MaxWidthWrapper, Switch } from "@dub/ui";
import { ShieldAlert } from "@dub/ui/icons";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function WorkspaceQRsClient() {
  const { data: session } = useSession();

  if (typeof window !== "undefined") {
    preloadAllFrames();
  }

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
      <WorkspaceQRs />
    </QrCodesDisplayProvider>
  );
}

function WorkspaceQRs() {
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
                      onClick={() => {
                        router.push(`/account/plans`);
                        router.refresh();
                      }}
                      text="Restore Access"
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
