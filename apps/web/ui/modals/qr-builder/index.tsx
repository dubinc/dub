"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import { QrBuilder } from "@/ui/qr-builder/qr-builder";
import { NewResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Modal } from "@dub/ui";
import { Options } from "qr-code-styling";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

export type QRBuilderData = {
  options: Options;
  frameOptions: {
    id: string;
  };
  getQRType: EQRType;
};

type QRBuilderModalProps = {
  props?: NewResponseQrCode;
  qrBuilderStepIdx: number;
  showQRBuilderModal: boolean;
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
  setQRBuilderStepIdx: Dispatch<SetStateAction<number>>;
};

export function QRBuilderModal(props: QRBuilderModalProps) {
  const handleSaveQR = (data: QRBuilderData) => {
    console.log(data);

    setTimeout(() => {
      props.setShowQRBuilderModal(false);
    }, 1000);
  };

  return (
    <Modal
      showModal={props.showQRBuilderModal}
      setShowModal={props.setShowQRBuilderModal}
      className="max-w-screen-lg"
    >
      <div className="flex flex-col gap-2">
        {/* header */}
        <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <QRIcon className="text-primary h-5 w-5" />
            <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
              {props.props
                ? `Edit QR - ${props.props.title ?? props.props.id}`
                : "New QR"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              props.setShowQRBuilderModal(false);
            }}
            className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <QrBuilder props={props?.props} handleSaveQR={handleSaveQR} />
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

export function useQRBuilder(data: { props?: NewResponseQrCode }) {
  const { props } = data ?? {};

  const [showQRBuilderModal, setShowQRBuilderModal] = useState(false);
  const [qrBuilderStepIdx, setQRBuilderStepIdx] = useState(0);

  const QRBuilderModalCallback = useCallback(() => {
    return (
      <QRBuilderModal
        props={props}
        showQRBuilderModal={showQRBuilderModal}
        qrBuilderStepIdx={qrBuilderStepIdx}
        setShowQRBuilderModal={setShowQRBuilderModal}
        setQRBuilderStepIdx={setQRBuilderStepIdx}
      />
    );
  }, [
    showQRBuilderModal,
    qrBuilderStepIdx,
    setShowQRBuilderModal,
    setQRBuilderStepIdx,
  ]);

  const CreateQRButtonCallback = useCallback(() => {
    return <CreateQRButton setShowQRBuilderModal={setShowQRBuilderModal} />;
  }, [setShowQRBuilderModal]);

  return useMemo(
    () => ({
      CreateQRButton: CreateQRButtonCallback,
      QRBuilderModal: QRBuilderModalCallback,
      setShowQRBuilderModal,
    }),
    [CreateQRButtonCallback, QRBuilderModalCallback, setShowQRBuilderModal],
  );
}
