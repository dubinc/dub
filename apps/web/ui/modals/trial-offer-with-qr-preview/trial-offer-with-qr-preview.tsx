"use client";

import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas";
import { QrStorageData } from "@/ui/qr-builder/types/types";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type";
import { FiveStarsComponent } from "@/ui/shared/five-stars.component";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import { ClientSessionComponent } from "core/integration/payment/client/client-session";
import { ICustomerBody } from "core/integration/payment/config";
import { Check, Gift } from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { QR_TYPES } from "../../qr-builder/constants/get-qr-config";
import { useQRPreviewModal } from "../qr-preview-modal";
import { AvatarsComponent } from "./components/avatars.component";
import { CreateSubscriptionFlow } from "./components/create-subscription-flow.component";
import { MOCK_QR } from "./constants/mock-qr";

interface IQRPreviewModalProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  qrCode: QRCodeStyling | null;
  showQRPreviewModal: boolean;
  setShowTrialOfferModal: Dispatch<SetStateAction<boolean>>;
  setShowQRPreviewModal: Dispatch<SetStateAction<boolean>>;
  firstQr: QrStorageData | null;
  user: ICustomerBody | null;
}

const FEATURES = [
  "Unlimited QR code scans & edits",
  "Full customization (colors, logos, frames)",
  "Dynamic & editable QR codes — update anytime",
  "Advanced analytics (track scans, devices, locations)",
  "High-quality downloads (PNG, JPG, SVG)",
];

function TrialOfferWithQRPreview({
  canvasRef,
  qrCode,
  showQRPreviewModal,
  setShowTrialOfferModal,
  setShowQRPreviewModal,
  user,
  firstQr,
}: IQRPreviewModalProps) {
  const { isMobile } = useMediaQuery();
  // const isMobile = true;

  const innerComponent = (
    <TrialOfferWithQRPreviewInner
      canvasRef={canvasRef}
      qrCode={qrCode}
      setShowTrialOfferModal={setShowTrialOfferModal}
      setShowQRPreviewModal={setShowQRPreviewModal}
      user={user}
      firstQr={firstQr}
    />
  );

  return (
    <>
      {!isMobile && (
        <Modal
          showModal={showQRPreviewModal}
          setShowModal={setShowTrialOfferModal}
          preventDefaultClose
          className="max-w-4xl border-gray-300"
        >
          {innerComponent}
        </Modal>
      )}

      {showQRPreviewModal && isMobile && (
        <div className="fixed left-0 top-0 flex h-full w-full items-center justify-center overflow-y-auto bg-white">
          <div className="h-full w-full max-w-4xl">{innerComponent}</div>
        </div>
      )}
    </>
  );
}

function TrialOfferWithQRPreviewInner({
  canvasRef,
  qrCode,
  setShowTrialOfferModal,
  setShowQRPreviewModal,
  user,
  firstQr,
}: Omit<IQRPreviewModalProps, "showQRPreviewModal">) {
  const { isMobile } = useMediaQuery();

  const [clientToken, setClientToken] = useState<string | null>(null);
  const currentQrTypeInfo = QR_TYPES.find(
    (item) => item.id === firstQr?.qrType,
  )!;

  const onSubcriptionCreated = () => {
    if (firstQr) {
      setShowQRPreviewModal(true);
    }

    setShowTrialOfferModal(false);
  };

  const onScrollToPaymentBlock = () => {
    const paymentBlock = document.getElementById("payment-block");
    if (paymentBlock) {
      paymentBlock.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Theme>
      <div className="flex w-full flex-col sm:flex-row">
        <div className="flex grow flex-col gap-4 bg-neutral-50 p-6">
          <div className="flex flex-col gap-2 text-center">
            {firstQr && (
              <h2 className="text-primary !mt-0 truncate text-2xl font-bold">
                Your QR Code is Ready!
              </h2>
            )}
          </div>

          <div className="relative flex w-full flex-col justify-center gap-2">
            {firstQr && (
              <div className="bg-primary-100 absolute left-0 top-0 z-10 rounded-tl-lg p-1">
                <QrCardType
                  className="bg-primary-100"
                  currentQrTypeInfo={currentQrTypeInfo}
                />
              </div>
            )}
            <QRCanvas
              ref={canvasRef}
              qrCode={qrCode}
              width={300}
              height={300}
            />

            <span className="text-center text-sm">
              {firstQr?.title || MOCK_QR.title}
            </span>
          </div>

          <div className="bg-primary-100 flex w-full flex-row items-center justify-between gap-4 rounded-lg p-3 shadow-none">
            <p className="text-sm">
              <span className="font-semibold">52.9K</span> QR codes created
              today
            </p>

            <AvatarsComponent />
          </div>
        </div>

        {isMobile ? (
          <div className="flex justify-center px-6 py-2">
            <Button
              onClick={onScrollToPaymentBlock}
              className="max-w-md"
              text={firstQr ? "Download Now!" : "Create QR Noew!"}
            />
          </div>
        ) : null}

        <div className="flex grow flex-col gap-4 p-6 sm:min-w-[50%] sm:max-w-[50%] sm:basis-[50%]">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-neutral !mt-0 truncate text-2xl font-bold">
              {firstQr
                ? "Unlock 7-Day Full Access"
                : "Start Now & Unlock 7-Day Full Access"}
            </h2>
            <h3 className="flex flex-wrap items-center justify-center gap-0.5 text-center text-base text-neutral-800">
              <span className="font-semibold">Excellent</span>{" "}
              <FiveStarsComponent /> <span className="font-bold">4.81</span>{" "}
              <span className="whitespace-nowrap">based on</span>{" "}
              <span className="font-bold">924</span> <span>reviews</span>
            </h3>
          </div>

          <ul className="flex flex-col gap-2 text-center">
            {FEATURES.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <div className="bg-primary-100 rounded-md p-1">
                  <Check className="text-primary h-4 w-4" />
                </div>

                <span className="text-left text-sm">{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-primary-100 flex items-center gap-2 rounded-lg px-3 py-[14px]">
            <Gift className="text-primary inline h-6 w-6" />

            <div>
              <p className="text-start text-sm font-medium">
                Promo Code GETQR-85 Applied
              </p>
              <p className="text-start text-sm font-normal text-zinc-500">
                You save 85%
              </p>
            </div>
          </div>

          <ClientSessionComponent onSessionCreated={setClientToken} />
          {clientToken && (
            <CreateSubscriptionFlow
              user={{
                ...user!,
                paymentInfo: { ...user!.paymentInfo, clientToken },
              }}
              onSubcriptionCreated={onSubcriptionCreated}
            />
          )}
        </div>
      </div>
    </Theme>
  );
}

export function useTrialOfferWithQRPreviewModal(data: {
  firstQr: QrStorageData | null;
  user: ICustomerBody | null;
}) {
  const { firstQr, user } = data;
  const [showTrialOfferModal, setShowTrialOfferModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { qrCode: demoBuiltQrCodeObject } = useQrCustomization(
    firstQr || MOCK_QR,
    true,
  );
  const { qrCode: builtQrCodeObject } = useQrCustomization(firstQr || MOCK_QR);

  const { QRPreviewModal, setShowQRPreviewModal } = useQRPreviewModal({
    canvasRef,
    qrCode: builtQrCodeObject,
    width: 200,
    height: 200,
  });

  const ModalCallback = useCallback(() => {
    return (
      <>
        <TrialOfferWithQRPreview
          user={user}
          firstQr={firstQr}
          canvasRef={canvasRef}
          qrCode={demoBuiltQrCodeObject}
          showQRPreviewModal={showTrialOfferModal}
          setShowTrialOfferModal={setShowTrialOfferModal}
          setShowQRPreviewModal={setShowQRPreviewModal}
        />

        <QRPreviewModal />
      </>
    );
  }, [showTrialOfferModal, QRPreviewModal]);

  return useMemo(
    () => ({
      TrialOfferWithQRPreviewModal: ModalCallback,
      setShowTrialOfferModal,
    }),
    [ModalCallback],
  );
}
