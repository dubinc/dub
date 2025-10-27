"use client";

import { CheckCircleFill, X } from "@/ui/shared/icons";
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
      <div>
        <CheckCircleFill className="h-6 w-6 stroke-2 text-green-500 sm:h-8 sm:w-8" />
      </div>
      <span className="text-left text-xs leading-relaxed text-neutral-700 sm:text-sm">
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
          <div className="space-y-3 px-8">
            <h2 className="text-neutral text-xl font-bold tracking-tight sm:text-2xl">
              Upgrade now to unlock your full QR features!
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
                Your QR codes are ready to go live again. It only takes a click to unlock:
              </p>
            </div>

            <ul className="space-y-2 sm:space-y-3">
              <FeatureItem text="Nothing lost. Your existing QR codes & scans are restored" />
              <FeatureItem text="Download your QR code in PNG, JPG, or SVG" />
              <FeatureItem text="Edit your QR code anytime, even after printing" />
              <FeatureItem text="Create unlimited QR codes" />
              <FeatureItem text="Track scans, devices & locations with analytics" />
              <FeatureItem text="Customize with colors, logos & frames" />
            </ul>
          </div>

          <div className="w-full space-y-3 pt-2 sm:space-y-4">
            <Button
              text="Restore Full Access"
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
