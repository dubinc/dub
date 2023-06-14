import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import BlurImage from "#/ui/blur-image";
import Modal from "@/components/shared/modal";
import { CheckCircleFill } from "@/components/shared/icons";
import { ExpandingArrow } from "#/ui/icons";
import useDomains from "#/lib/swr/use-domains";
import useLinksCount from "#/lib/swr/use-links-count";
import { ModalContext } from "#/ui/modal-provider";

function CompleteSetupModal({
  showCompleteSetupModal,
  setShowCompleteSetupModal,
}: {
  showCompleteSetupModal: boolean;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { verified } = useDomains();
  const { data: count } = useLinksCount() as unknown as { data: number };
  const { setShowAddEditLinkModal } = useContext(ModalContext);

  const tasks = useMemo(() => {
    return [
      {
        display: "Configure your custom domain",
        cta: `/${slug}/domains`,
        checked: verified,
      },
      {
        display: "Invite your teammates",
        cta: `/${slug}/settings/people`,
        checked: false,
      },
      {
        display: "Create or import your links",
        cta: "create-link",
        checked: count > 0,
      },
    ];
  }, [slug, verified, count]);

  return (
    <Modal
      showModal={showCompleteSetupModal}
      setShowModal={setShowCompleteSetupModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={`/_static/logo.png`}
            alt={"Invite Teammate"}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">You're almost there!</h3>
          <p className="text-center text-sm text-gray-500">
            Complete the following steps and start sharing your branded short
            links.
          </p>
        </div>
        <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-12">
          <div className="grid divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {tasks.map(({ display, cta, checked }) => {
              const contents = (
                <div className="group flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircleFill
                      className={`h-5 w-5 ${
                        checked ? "text-green-500" : "text-gray-400"
                      }`}
                    />
                    <p className="text-sm">{display}</p>
                  </div>
                  <div className="mr-5">
                    <ExpandingArrow />
                  </div>
                </div>
              );
              if (cta === "create-link") {
                return (
                  <button
                    key={display}
                    onClick={() => {
                      setShowCompleteSetupModal(false);
                      setShowAddEditLinkModal(true);
                    }}
                  >
                    {contents}
                  </button>
                );
              }
              return (
                <a key={display} target="_blank" rel="noreferrer" href={cta}>
                  {contents}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function useCompleteSetupModal() {
  const [showCompleteSetupModal, setShowCompleteSetupModal] = useState(false);

  const CompleteSetupModalCallback = useCallback(() => {
    return (
      <CompleteSetupModal
        showCompleteSetupModal={showCompleteSetupModal}
        setShowCompleteSetupModal={setShowCompleteSetupModal}
      />
    );
  }, [showCompleteSetupModal, setShowCompleteSetupModal]);

  return useMemo(
    () => ({
      setShowCompleteSetupModal,
      CompleteSetupModal: CompleteSetupModalCallback,
    }),
    [setShowCompleteSetupModal, CompleteSetupModalCallback],
  );
}
