"use client";

import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import useUser from "@/lib/swr/use-user.ts";
import { UserProps } from "@/lib/types.ts";
import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { QrBuilder } from "@/ui/qr-builder/qr-builder";
import { QRBuilderData, QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Modal } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { LoaderCircle } from "lucide-react";

type QRBuilderModalProps = {
  props?: QrStorageData;
  user: UserProps;
  showQRBuilderModal: boolean;
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
  initialStep?: number;
};

export function QRBuilderModal({
  props,
  user,
  showQRBuilderModal,
  setShowQRBuilderModal,
  initialStep,
}: QRBuilderModalProps) {
  const { createQr, updateQrWithOriginal } = useQrOperations();
  const { isMobile } = useMediaQuery();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveQR = async (data: QRBuilderData) => {
    setIsProcessing(true);

    if (data.styles.data === DEFAULT_WEBSITE) {
      setIsProcessing(false);
      toast.error("Data of QR Code not found.");
      return;
    }

    if (props) {
      const isDataShortLink = data.styles.data?.includes(
        process.env.NEXT_PUBLIC_APP_SHORT_DOMAIN!,
      );

      if (isDataShortLink && props.link?.url) {
        data.styles.data = props.link.url;
      }

      await updateQrWithOriginal(props, data);
    } else {
      await createQr(data);
    }

    setIsProcessing(false);
    setShowQRBuilderModal(false);
  };

  const modalContent = (
    <div className="flex h-full flex-col gap-2 overflow-y-auto bg-white md:h-fit">
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm">
          <LoaderCircle className="text-secondary h-8 w-8 animate-spin" />
        </div>
      )}
      <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
        <div className="flex items-center gap-2">
          <QRIcon className="text-primary h-5 w-5" />
          <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
            {props ? `Edit QR - ${props.title ?? props.id}` : "New QR"}
          </h3>
        </div>
        <button
          onClick={() => setShowQRBuilderModal(false)}
          disabled={isProcessing}
          type="button"
          className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Theme>
        <QrBuilder
          sessionId={user?.id}
          isEdit={!!props}
          props={props}
          user={user}
          handleSaveQR={handleSaveQR}
          isProcessing={isProcessing}
          initialStep={initialStep}
        />
      </Theme>
    </div>
  );

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setShowQRBuilderModal(false);
    }
  }, [isProcessing, setShowQRBuilderModal]);

  useKeyboardShortcut("Escape", handleClose);

  if (isMobile) {
    return (
      <Drawer.Root
        open={showQRBuilderModal}
        onOpenChange={setShowQRBuilderModal}
        dismissible={false}
        repositionInputs={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex !h-[100dvh] !max-h-[100dvh] !min-h-[100dvh] flex-col rounded-t-[10px] bg-white">
            <div className="flex-1 overflow-y-auto">{modalContent}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Modal
      showModal={showQRBuilderModal}
      setShowModal={setShowQRBuilderModal}
      desktopOnly
      className="border-border-500 w-full max-w-6xl overflow-hidden"
    >
      {modalContent}
    </Modal>
  );
}

function CreateQRButton({
  user,
  setShowQRBuilderModal,
}: {
  user: UserProps;
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
}) {
  useKeyboardShortcut("c", () => setShowQRBuilderModal(true));

  return (
    <Button
      text="Create QR code"
      onClick={() => {
        trackClientEvents({
          event: EAnalyticEvents.PAGE_CLICKED,
          params: {
            page_name: "profile",
            content_value: "create_qr",
            email: user?.email,
            event_category: "Authorized",
          },
          sessionId: user?.id,
        });
        setShowQRBuilderModal(true);
      }}
    />
  );
}

export function useQRBuilder(data?: {
  props?: QrStorageData;
  initialStep?: number;
}) {
  const { user } = useUser();
  const { props, initialStep } = data ?? {};

  const [showQRBuilderModal, setShowQRBuilderModal] = useState(false);

  const QRBuilderModalCallback = useCallback(() => {
    return (
      <QRBuilderModal
        props={props}
        user={user!}
        showQRBuilderModal={showQRBuilderModal}
        setShowQRBuilderModal={setShowQRBuilderModal}
        initialStep={initialStep}
      />
    );
  }, [props, showQRBuilderModal, setShowQRBuilderModal, initialStep, user]);

  const CreateQRButtonCallback = useCallback(() => {
    return (
      <CreateQRButton
        user={user!}
        setShowQRBuilderModal={setShowQRBuilderModal}
      />
    );
  }, [user, setShowQRBuilderModal]);

  return useMemo(
    () => ({
      CreateQRButton: CreateQRButtonCallback,
      QRBuilderModal: QRBuilderModalCallback,
      setShowQRBuilderModal,
    }),
    [CreateQRButtonCallback, QRBuilderModalCallback, setShowQRBuilderModal],
  );
}
