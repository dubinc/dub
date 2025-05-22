"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";

import { mutatePrefix } from "@/lib/swr/mutate.ts";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { QrBuilder } from "@/ui/qr-builder/qr-builder";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Modal } from "@dub/ui";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { useParams } from "next/navigation";
import { Options } from "qr-code-styling";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

export type QRBuilderData = {
  styles: Options;
  frameOptions: {
    id: string;
  };
  qrType: EQRType;
};

type QRBuilderModalProps = {
  props?: ResponseQrCode;
  showQRBuilderModal: boolean;
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
};

export function QRBuilderModal({
  props,
  showQRBuilderModal,
  setShowQRBuilderModal,
  isProcessing,
  setIsProcessing,
}: QRBuilderModalProps) {
  const params = useParams() as { slug?: string };
  const { slug } = params;

  const { id: workspaceId } = useWorkspace();

  const endpoint = useMemo(
    () =>
      props
        ? {
            method: "PATCH",
            url: `/api/qrs/${props.id}?workspaceId=${workspaceId}`,
          }
        : {
            method: "POST",
            url: `/api/qrs?workspaceId=${workspaceId}`,
          },
    [props, workspaceId],
  );

  const handleSaveQR = async (data: QRBuilderData) => {
    setIsProcessing(true);

    if (data.styles.data === DEFAULT_WEBSITE) {
      setIsProcessing(false);
      toast.error("Data of QR Code not found.");
    }

    try {
      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          data: data.styles.data,
          link: {
            url: data.styles.data,
            domain: SHORT_DOMAIN,
            tagId: null,
            tags: [],
            webhookIds: [],
          },
        }),
      });

      if (res.status === 200) {
        await mutatePrefix([
          "/api/qrs",
          "/api/links",
          `/api/workspaces/${slug}`,
        ]);

        // const data = await res.json();

        if (!props) {
          toast.success("Successfully created QR!");
        } else toast.success("Successfully updated QR!");

        setShowQRBuilderModal(false);
      }
      // else {
      //   const { error } = await res.json();
      //
      //   if (error) {
      //     if (error.message.includes("Upgrade to")) {
      //       toast.custom(() => (
      //           <UpgradeRequiredToast
      //               title={`You've discovered a ${nextPlan.name} feature!`}
      //               message={error.message}
      //           />
      //       ));
      //     } else {
      //       toast.error(error.message);
      //     }
      //     const message = error.message.toLowerCase();
      //
      //     if (message.includes("key"))
      //       setError("key", { message: error.message });
      //     else if (message.includes("url"))
      //       setError("url", { message: error.message });
      //     else setError("root", { message: "Failed to save link" });
      //   } else {
      //     setError("root", { message: "Failed to save link" });
      //     toast.error("Failed to save link");
      //   }
      // }
    } catch (e) {
      setIsProcessing(false);
      // setError("root", { message: "Failed to save link" });
      console.error("Failed to save QR", e);
      toast.error("Failed to save QR");
    }
  };

  return (
    <Modal
      showModal={showQRBuilderModal}
      setShowModal={setShowQRBuilderModal}
      className="border-border-500 h-fit max-w-screen-lg transition-[height] duration-[300ms]"
    >
      <div className="flex flex-col gap-2">
        {/* header */}
        <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <QRIcon className="text-primary h-5 w-5" />
            <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
              {props ? `Edit QR - ${props.title ?? props.id}` : "New QR"}
            </h3>
          </div>
          <button
            disabled={isProcessing}
            type="button"
            onClick={() => {
              setShowQRBuilderModal(false);
            }}
            className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <QrBuilder
          isEdit={!!props}
          isProcessing={isProcessing}
          props={props}
          handleSaveQR={handleSaveQR}
        />
      </div>
    </Modal>
  );
}

type CreateQRButtonProps = {
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
};

export function CreateQRButton(props: CreateQRButtonProps) {
  // const { slug, nextPlan, exceededLinks } = useWorkspace();

  useKeyboardShortcut("c", () => props.setShowQRBuilderModal(true));

  return (
    <Button
      text="Create QR code"
      // shortcut="C"
      onClick={() => props.setShowQRBuilderModal(true)}
    />
  );
}

export function useQRBuilder(data?: { props?: ResponseQrCode }) {
  const { props } = data ?? {};

  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRBuilderModal, setShowQRBuilderModal] = useState(false);

  const QRBuilderModalCallback = useCallback(() => {
    return (
      <QRBuilderModal
        props={props}
        showQRBuilderModal={showQRBuilderModal}
        setShowQRBuilderModal={setShowQRBuilderModal}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    );
  }, [
    props,
    showQRBuilderModal,
    setShowQRBuilderModal,
    isProcessing,
    setIsProcessing,
  ]);

  const CreateQRButtonCallback = useCallback(() => {
    return <CreateQRButton setShowQRBuilderModal={setShowQRBuilderModal} />;
  }, [setShowQRBuilderModal]);

  return useMemo(
    () => ({
      CreateQRButton: CreateQRButtonCallback,
      QRBuilderModal: QRBuilderModalCallback,
      setShowQRBuilderModal,
      isProcessing,
    }),
    [
      CreateQRButtonCallback,
      QRBuilderModalCallback,
      setShowQRBuilderModal,
      isProcessing,
    ],
  );
}
