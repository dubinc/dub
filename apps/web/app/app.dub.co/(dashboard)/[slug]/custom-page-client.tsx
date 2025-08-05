"use client";

import { useTrialStatus } from "@/lib/contexts/trial-status-context";
import useQrs from "@/lib/swr/use-qrs.ts";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import { useQRPreviewModal } from "@/ui/modals/qr-preview-modal";
import { preloadAllFrames } from "@/ui/qr-builder/constants/customization/frames.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import QrCodeSort from "@/ui/qr-code/qr-code-sort.tsx";
import QrCodesContainer from "@/ui/qr-code/qr-codes-container.tsx";
import { QrCodesDisplayProvider } from "@/ui/qr-code/qr-codes-display-provider.tsx";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { Button, MaxWidthWrapper } from "@dub/ui";
import { ShieldAlert } from "@dub/ui/icons";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface WorkspaceQRsClientProps {
  initialQrs: QrStorageData[];
}

export default function WorkspaceQRsClient({
  initialQrs,
}: WorkspaceQRsClientProps) {
  if (typeof window !== "undefined") {
    preloadAllFrames();
  }

  return (
    <QrCodesDisplayProvider>
      <WorkspaceQRs initialQrs={initialQrs} />

      <QRPreviewModalWrapper initialQrs={initialQrs} />
    </QrCodesDisplayProvider>
  );
}

function WorkspaceQRs({ initialQrs }: { initialQrs: QrStorageData[] }) {
  const router = useRouter();
  const { isValidating } = useQrs({}, {}, true); // listenOnly mode

  const { isTrialOver } = useTrialStatus();

  const { CreateQRButton, QRBuilderModal } = useQRBuilder();

  return (
    <>
      <QRBuilderModal />

      <div className="flex w-full items-center pt-2">
        <MaxWidthWrapper className="flex flex-col gap-y-3">
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

                <div className="grow-0">
                  <CreateQRButton />
                </div>
              </div>
            </div>
          )}
        </MaxWidthWrapper>
      </div>

      <div className="mt-3">
        <QrCodesContainer
          CreateQrCodeButton={!isTrialOver ? CreateQRButton : () => <></>}
          isTrialOver={isTrialOver}
          initialQrs={initialQrs}
        />
      </div>
    </>
  );
}

function QRPreviewModalWrapper({
  initialQrs,
}: {
  initialQrs: QrStorageData[];
}) {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstQr = initialQrs?.[0];

  const { qrCode: builtQrCodeObject } = useQrCustomization(firstQr);
  const { QRPreviewModal, setShowQRPreviewModal } = useQRPreviewModal({
    canvasRef,
    qrCode: builtQrCodeObject,
    width: 200,
    height: 200,
  });

  const shouldShowWelcomeModal = searchParams.has("onboarded");

  useEffect(() => {
    setShowQRPreviewModal(
      shouldShowWelcomeModal && !!builtQrCodeObject && !!firstQr,
    );
  }, [searchParams, shouldShowWelcomeModal, builtQrCodeObject, firstQr]);

  return firstQr ? <QRPreviewModal /> : null;
}
