import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import Modal from "@/components/shared/modal";
import BlurImage from "#/ui/blur-image";
import Button from "#/ui/button";
import { useRouter } from "next/router";
import Link from "next/link";

function UpgradePlanModal({
  showUpgradePlanModal,
  setShowUpgradePlanModal,
  welcomeFlow,
}: {
  showUpgradePlanModal: boolean;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  welcomeFlow?: boolean;
}) {
  const router = useRouter();
  const { slug } = router.query;
  return (
    <Modal
      showModal={showUpgradePlanModal}
      setShowModal={setShowUpgradePlanModal}
      closeWithX={welcomeFlow}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
          <BlurImage
            src="/_static/logo.png"
            alt="Dub logo"
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Upgrade Plan</h3>
        </div>
        <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 text-left sm:px-16">
          <Button
            text="Upgrade plan"
            onClick={() => {
              setShowUpgradePlanModal(false);
            }}
          />
          {welcomeFlow && (
            <Link
              href={`/${slug}`}
              className="text-center text-xs text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-800"
            >
              Skip for now
            </Link>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function useUpgradePlanModal({
  welcomeFlow,
}: { welcomeFlow?: boolean } = {}) {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);

  const UpgradePlanModalCallback = useCallback(() => {
    return (
      <UpgradePlanModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
        welcomeFlow={welcomeFlow}
      />
    );
  }, [showUpgradePlanModal, setShowUpgradePlanModal, welcomeFlow]);

  return useMemo(
    () => ({
      setShowUpgradePlanModal,
      UpgradePlanModal: UpgradePlanModalCallback,
    }),
    [setShowUpgradePlanModal, UpgradePlanModalCallback],
  );
}
