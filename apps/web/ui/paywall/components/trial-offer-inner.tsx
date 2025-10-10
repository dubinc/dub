"use client";

import { AvatarsComponent } from "@/ui/modals/trial-offer-with-qr-preview/components/avatars.component";
import { CreateSubscriptionFlow } from "@/ui/modals/trial-offer-with-qr-preview/components/create-subscription-flow.component";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas";
import { QrStorageData } from "@/ui/qr-builder/types/types";
import { FiveStarsComponent } from "@/ui/shared/five-stars.component";
import { Button, useMediaQuery } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { ClientSessionComponent } from "core/integration/payment/client/client-session";
import { ICustomerBody } from "core/integration/payment/config";
import { Check, Gift } from "lucide-react";
import { FC, useMemo, useRef, useState } from "react";
import { MOCK_QR } from "../constants/mock-qr";

const FEATURES = [
  "Download your QR code in PNG, JPG, or SVG",
  "Edit your QR code anytime, even after printing",
  "Create unlimited QR codes",
  "Track scans, devices & locations with analytics",
  "Customize with colors, logos & frames",
];

interface ITrialOfferProps {
  user: ICustomerBody | null;
  firstQr: QrStorageData | null;
}

export const TrialOfferInner: FC<Readonly<ITrialOfferProps>> = ({
  user,
  firstQr,
}) => {
  const { isMobile } = useMediaQuery();

  const [clientToken, setClientToken] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const memoizedQrData = useMemo(() => {
    return firstQr
      ? ({
          ...firstQr,
          link: {
            shortLink: process.env.NEXT_PUBLIC_APP_DOMAIN
              ? `${process.env.NEXT_PUBLIC_APP_DOMAIN}`
              : "http://localhost:8888",
          },
        } as QrStorageData)
      : MOCK_QR;
  }, [firstQr]);

  const { qrCode: demoBuiltQrCodeObject } = useQrCustomization(
    memoizedQrData,
    true,
  );

  const isPaidTraffic = user?.isPaidUser || false;

  const onSubcriptionCreated = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_VIEWED,
      params: {
        page_name: "dashboard",
        content_group: "my_qr_codes",
        event_category: "Authorized",
        email: user?.email,
      },
      sessionId: user?.id,
    });
  };

  const onScrollToPaymentBlock = () => {
    const paymentBlock = document.getElementById("payment-block");
    if (paymentBlock) {
      paymentBlock.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Theme>
      <div className="flex w-full flex-col overflow-y-auto sm:flex-row">
        <div className="flex grow flex-col items-center gap-4 bg-neutral-50 p-6">
          <div className="flex flex-col gap-2 text-center">
            {firstQr && (
              <h2 className="text-primary !mt-0 truncate text-2xl font-bold">
                Your QR Code is Ready!
              </h2>
            )}
          </div>

          <div className="relative flex w-full max-w-[300px] flex-col justify-center gap-2">
            <QRCanvas
              ref={canvasRef}
              qrCode={demoBuiltQrCodeObject}
              width={300}
              height={300}
            />

            <span className="text-center text-sm">
              {firstQr?.title || MOCK_QR.title}
            </span>
          </div>

          <h3 className="flex flex-wrap items-center justify-center gap-0.5 text-center text-base text-neutral-800">
            <FiveStarsComponent className="mr-1" />
            <span className="whitespace-nowrap">Trusted by over</span>{" "}
            <span className="font-bold">700,000</span> people
          </h3>

          {isMobile ? (
            <div className="flex w-full justify-center py-2">
              <Button
                onClick={onScrollToPaymentBlock}
                className="max-w-md"
                text={firstQr ? "Download Now!" : "Create QR Noew!"}
              />
            </div>
          ) : null}

          <div className="bg-primary-100 flex hidden w-full max-w-[360px] flex-row items-center justify-between gap-4 rounded-lg p-3 shadow-none sm:flex">
            <p className="text-sm">
              <span className="font-semibold">52.9K</span> QR codes created
              today
            </p>

            <AvatarsComponent />
          </div>
        </div>

        <div className="flex grow flex-col gap-4 p-6 sm:min-w-[50%] sm:max-w-[50%] sm:basis-[50%]">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-neutral !mt-0 truncate text-2xl font-bold">
              {isPaidTraffic && firstQr
                ? "Download Your QR Code"
                : "Unlock 7-Day Full Access"}
            </h2>
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
              isPaidTraffic={isPaidTraffic}
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
};
