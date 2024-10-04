import useDomainsCount from "@/lib/swr/use-domains-count";
import useLinksCount from "@/lib/swr/use-links-count";
import useUsers from "@/lib/swr/use-users";
import { ModalContext } from "@/ui/modals/modal-provider";
import { CheckCircleFill } from "@/ui/shared/icons";
import { ExpandingArrow, Logo, Modal } from "@dub/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

function CompleteSetupModal({
  showCompleteSetupModal,
  setShowCompleteSetupModal,
}: {
  showCompleteSetupModal: boolean;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useParams() as { slug: string };

  const { data: domainsCount } = useDomainsCount();
  const { data: linksCount } = useLinksCount({ ignoreParams: true });
  const { users } = useUsers();
  const { users: invites } = useUsers({ invites: true });
  const { setShowLinkBuilder } = useContext(ModalContext);

  const tasks = useMemo(() => {
    return [
      {
        display: "Set up your custom domain",
        cta: `/${slug}/settings/domains`,
        checked: domainsCount && domainsCount > 0,
      },
      {
        display: "Create or import your links",
        cta: `/${slug}`,
        checked: linksCount > 0,
      },
      {
        display: "Invite your teammates",
        cta: `/${slug}/settings/people`,
        checked: (users && users.length > 1) || (invites && invites.length > 0),
      },
    ];
  }, [slug, domainsCount, linksCount, users, invites]);

  return (
    <Modal
      showModal={showCompleteSetupModal}
      setShowModal={setShowCompleteSetupModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
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
            return (
              <Link
                key={display}
                href={cta}
                onClick={() => {
                  setShowCompleteSetupModal(false);
                  display === "Create or import your links" &&
                    setShowLinkBuilder(true);
                }}
              >
                {contents}
              </Link>
            );
          })}
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
