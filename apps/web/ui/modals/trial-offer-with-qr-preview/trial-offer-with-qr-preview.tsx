"use client";

import { QRCanvas } from "@/ui/qr-builder/qr-canvas";
import { Modal } from "@dub/ui";
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
  useState,
} from "react";
import { EQRType, QR_TYPES } from "../../qr-builder/constants/get-qr-config";
import { QrCardType } from "../../qr-code/qr-code-card-type";
import { FiveStarsComponent } from "../../shared/five-stars.component";
import { AvatarsComponent } from "./avatars.component";
import { CreateSubscriptionFlow } from "./create-subscription-flow";

interface IQRPreviewModalProps {
  showQRPreviewModal: boolean;
  setShowQRPreviewModal: Dispatch<SetStateAction<boolean>>;
  canvasRef: RefObject<HTMLCanvasElement>;
  qrCode: QRCodeStyling | null;
  qrType: EQRType | null;
  width?: number;
  height?: number;
  user: ICustomerBody | null;
}

const FEATURES = [
  "Unlimited QR code scans & edits",
  "Full customization (colors, logos, frames",
  "Dynamic & editable QR codes — update anytime",
  "Advanced analytics (track scans, devices, locations)",
  "High-quality downloads (PNG, JPG, SVG)",
];

function TrialOfferWithQRPreview({
  showQRPreviewModal,
  setShowQRPreviewModal,
  canvasRef,
  qrCode,
  qrType,
  width = 200,
  height = 200,
  user,
}: IQRPreviewModalProps) {
  // const { queryParams } = useRouterStuff();
  const [clientToken, setClientToken] = useState<string | null>(null);
  const currentQrTypeInfo = QR_TYPES.find((item) => item.id === qrType)!;

  return (
    <Modal
      showModal={showQRPreviewModal}
      setShowModal={setShowQRPreviewModal}
      preventDefaultClose
      // onClose={() =>
      //   queryParams({
      //     del: ["onboarded"],
      //   })
      // }
      className="border-border-500 max-w-4xl"
    >
      <Theme>
        <div className="flex">
          <div className="flex w-1/2 flex-col gap-4 bg-neutral-50 p-6">
            <div className="flex flex-col gap-2 text-center">
              <h3 className="text-primary !mt-0 truncate text-2xl font-bold">
                Your QR Code is Ready!
              </h3>
              <h2 className="text-center text-lg font-semibold text-neutral-800">
                Download Now & Unlock Full Access
              </h2>
            </div>

            <div className="relative flex w-full justify-center">
              <div className="bg-secondary-100 absolute left-0 top-0 z-10 rounded-tl-lg p-1">
                <QrCardType currentQrTypeInfo={currentQrTypeInfo} />
              </div>
              <QRCanvas
                ref={canvasRef}
                qrCode={qrCode}
                width={width}
                height={height}
              />
            </div>

            <div className="flex w-full flex-row items-center justify-between gap-4 rounded-lg bg-neutral-200/10 p-3 shadow-none">
              <p className="text-sm">
                <span className="font-semibold">52.9K</span> QR codes created
                today
              </p>

              <AvatarsComponent />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2 text-center">
              <h3 className="text-neutral !mt-0 truncate text-2xl font-bold">
                Download Now!
              </h3>
              <h2 className="flex items-center gap-0.5 text-center text-lg text-neutral-800">
                <span className="font-semibold">Excellent</span>{" "}
                <FiveStarsComponent /> <span className="font-bold">4.81</span>{" "}
                <span>based on</span> <span className="font-bold">924</span>{" "}
                <span>reviews</span>
              </h2>
            </div>

            <ul className="flex flex-col gap-2 text-center">
              {FEATURES.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="bg-secondary-100/50 rounded-md p-1">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>

                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-secondary-100/50 flex items-center gap-2 rounded-lg px-3 py-[14px]">
              <Gift className="inline h-6 w-6 text-green-500" />

              <div>
                <p className="text-start text-sm font-medium text-violet-900">
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
              />
            )}
          </div>
        </div>
      </Theme>
    </Modal>
  );
}

export function useTrialOfferWithQRPreviewModal(data: {
  canvasRef: RefObject<HTMLCanvasElement>;
  qrCode: QRCodeStyling | null;
  qrType: EQRType | null;
  width?: number;
  height?: number;
  user: ICustomerBody | null;
}) {
  const { canvasRef, qrCode, width = 200, height = 200, qrType, user } = data;
  const [showQRPreviewModal, setShowQRPreviewModal] = useState(false);

  const ModalCallback = useCallback(() => {
    return (
      <TrialOfferWithQRPreview
        user={user}
        canvasRef={canvasRef}
        qrCode={qrCode}
        qrType={qrType}
        width={width}
        height={height}
        showQRPreviewModal={showQRPreviewModal}
        setShowQRPreviewModal={setShowQRPreviewModal}
      />
    );
  }, [width, height, showQRPreviewModal]);

  return useMemo(
    () => ({
      TrialOfferWithQRPreviewModal: ModalCallback,
      setShowQRPreviewModal,
    }),
    [ModalCallback],
  );
}
