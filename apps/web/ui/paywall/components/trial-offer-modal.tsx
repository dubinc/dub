"use client";

import { QRBuilderData } from "@/ui/qr-builder/types/types";
import { Modal, useMediaQuery } from "@dub/ui";
import {
  setPeopleAnalyticOnce,
  trackClientEvents,
} from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { ICustomerBody } from "core/integration/payment/config";
import { FC, useEffect } from "react";
import { TrialOfferInner } from "./trial-offer-inner";

interface ITrialOfferProps {
  user: ICustomerBody | null;
  firstQr: QRBuilderData | null;
  isPaidTraffic: boolean;
}

export const TrialOfferModal: FC<Readonly<ITrialOfferProps>> = ({
  user,
  firstQr,
  isPaidTraffic,
}) => {
  const { isMobile } = useMediaQuery();

  const innerComponent = (
    <TrialOfferInner
      user={user}
      firstQr={firstQr}
      isPaidTraffic={isPaidTraffic}
    />
  );

  useEffect(() => {
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_OPENED,
      params: {
        page_name: "paywall",
        element_name: "payment_modal",
        content_group: "my_qr_codes",
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
  }, []);

  useEffect(() => {
    if (user?.isPaidUser) {
      setPeopleAnalyticOnce({ acquisition_type: "paid" });
    } else {
      setPeopleAnalyticOnce({ acquisition_type: null });
    }
  }, []);

  return (
    <>
      {!isMobile && (
        <Modal
          showModal
          setShowModal={() => {}}
          preventDefaultClose
          className="max-h-[90vh] max-w-4xl border-gray-300"
        >
          {innerComponent}
        </Modal>
      )}

      {isMobile && (
        <div className="fixed left-0 top-0 flex h-full w-full items-center justify-center overflow-y-auto bg-white">
          <div className="h-full w-full max-w-4xl">{innerComponent}</div>
        </div>
      )}
    </>
  );
};
