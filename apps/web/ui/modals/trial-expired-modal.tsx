"use client";

import { TrialClicks, TrialDays } from "@/lib/constants/trial";
import { X } from "@/ui/shared/icons";
import { Button, Modal } from "@dub/ui";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";

interface ITrialExpiredModalProps {
  showModal?: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}

interface IFeatureItemProps {
  text: string;
}

function FeatureItem({ text }: IFeatureItemProps) {
  return (
    <li className="flex items-center justify-start gap-3 sm:gap-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 sm:h-8 sm:w-8">
        <X className="h-3 w-3 stroke-2 text-red-500 sm:h-4 sm:w-4" />
      </div>
      <span className="text-left text-sm leading-relaxed text-neutral-700 sm:text-base">
        {text}
      </span>
    </li>
  );
}

export function TrialExpiredModal({
  showModal = true,
  setShowModal,
}: ITrialExpiredModalProps) {
  const router = useRouter();

  const handleRestoreAccess = () => {
    setShowModal(false);
    router.push(`/account/plans`);
    router.refresh();
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="border-border-500 max-w-lg p-0"
    >
      <div className="border-border-500 relative p-4 sm:p-6 md:p-8">
        <button
          onClick={handleClose}
          className="absolute hidden rounded-full p-1 transition-colors hover:bg-neutral-100 md:right-2 md:top-1.5 md:block"
        >
          <X className="h-5 w-5 text-neutral-500 hover:text-neutral-700" />
        </button>

        <div className="flex flex-col items-center space-y-4 text-center sm:space-y-6">
          <div className="space-y-3">
            <h2 className="text-neutral text-xl font-bold tracking-tight sm:text-2xl">
              Free Access Has Ended — Upgrade to Keep Going
            </h2>
          </div>

          {/*<div className="flex w-full justify-center gap-3 sm:gap-4">*/}
          {/*  <div className="border-secondary/20 bg-secondary-100 flex h-16 w-16 flex-col items-center justify-center rounded-2xl border sm:h-20 sm:w-20">*/}
          {/*    <span className="text-secondary text-2xl font-bold sm:text-4xl">*/}
          {/*      0*/}
          {/*    </span>*/}
          {/*    <span className="text-secondary text-xs font-semibold tracking-wide">*/}
          {/*      DAYS*/}
          {/*    </span>*/}
          {/*  </div>*/}
          {/*  <div className="border-secondary/20 bg-secondary-100 flex h-16 w-16 flex-col items-center justify-center rounded-2xl border sm:h-20 sm:w-20">*/}
          {/*    <span className="text-secondary text-2xl font-bold sm:text-4xl">*/}
          {/*      0*/}
          {/*    </span>*/}
          {/*    <span className="text-secondary text-xs font-semibold tracking-wide">*/}
          {/*      HOURS*/}
          {/*    </span>*/}
          {/*  </div>*/}
          {/*  <div className="border-secondary/20 bg-secondary-100 flex h-16 w-16 flex-col items-center justify-center rounded-2xl border sm:h-20 sm:w-20">*/}
          {/*    <span className="text-secondary text-2xl font-bold sm:text-4xl">*/}
          {/*      0*/}
          {/*    </span>*/}
          {/*    <span className="text-secondary text-xs font-semibold tracking-wide">*/}
          {/*      MIN*/}
          {/*    </span>*/}
          {/*  </div>*/}
          {/*</div>*/}

          <div className="w-full space-y-3 sm:space-y-4">
            <div className="text-left">
              <p className="text-medium text-sm leading-relaxed text-neutral-800 sm:text-base">
                Free access has expired because you’ve either reached the{" "}
                {TrialDays}-day usage limit or completed {TrialClicks} scans.
                <br />
                <br />
                <span className="text-neutral">
                  Because of this, the following features are now disabled:
                </span>
              </p>
            </div>

            <ul className="space-y-2 sm:space-y-3">
              <FeatureItem text="Your dynamic QR codes are no longer scannable." />
              <FeatureItem text="You can’t create new codes or edit existing ones." />
              <FeatureItem text="Detailed tracking metrics are inaccessible." />
              <FeatureItem text="Asset downloads are disabled." />
            </ul>
          </div>

          <div className="w-full space-y-3 pt-2 sm:space-y-4">
            <p className="text-left text-sm font-medium leading-relaxed text-neutral-700 md:text-center md:text-base">
              Upgrade now to restore full access and continue enjoying all GetQR
              features!
            </p>

            <Button
              text="Restore Access"
              variant="primary"
              className="bg-secondary hover:bg-secondary-800 h-10 w-full text-sm font-medium sm:h-12 sm:text-base"
              onClick={handleRestoreAccess}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
