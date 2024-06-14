import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Button, LinkLogo, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function PrimaryDomainModal({
  showPrimaryDomainModal,
  setShowPrimaryDomainModal,
  props,
}: {
  showPrimaryDomainModal: boolean;
  setShowPrimaryDomainModal: Dispatch<SetStateAction<boolean>>;
  props: DomainProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const domain = props.slug;

  const setPrimary = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/domains/${domain}/primary?workspaceId=${workspaceId}`,
      {
        method: "POST",
      },
    );
    if (response.ok) {
      await mutate(`/api/domains?workspaceId=${workspaceId}`);
      setLoading(false);
      setShowPrimaryDomainModal(false);
    } else {
      const { error } = await response.json();
      throw new Error(error.message);
    }
  };

  return (
    <Modal
      showModal={showPrimaryDomainModal}
      setShowModal={setShowPrimaryDomainModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo apexDomain={domain} />
        <h3 className="text-lg font-medium">Set {domain} as primary domain</h3>
        <p className="text-sm text-gray-500">
          Setting this domain as primary will make it the default domain in the
          link creation modal, as well as in the API.{" "}
          <a
            href="https://dub.co/help/article/how-to-set-primary-domain"
            target="_blank"
            className="text-gray-500 underline underline-offset-4 hover:text-gray-800"
          >
            Learn more
          </a>
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={() =>
            toast.promise(setPrimary, {
              loading: `Setting ${domain} as the primary domain...`,
              success: `Successfully set ${domain} as the primary domain!`,
              error: (error) => {
                return error.message;
              },
            })
          }
          autoFocus
          loading={loading}
          text="Set as primary domain"
        />
      </div>
    </Modal>
  );
}

export function usePrimaryDomainModal({ props }: { props: DomainProps }) {
  const [showPrimaryDomainModal, setShowPrimaryDomainModal] = useState(false);

  const PrimaryDomainModalCallback = useCallback(() => {
    return props ? (
      <PrimaryDomainModal
        showPrimaryDomainModal={showPrimaryDomainModal}
        setShowPrimaryDomainModal={setShowPrimaryDomainModal}
        props={props}
      />
    ) : null;
  }, [showPrimaryDomainModal, setShowPrimaryDomainModal]);

  return useMemo(
    () => ({
      setShowPrimaryDomainModal,
      PrimaryDomainModal: PrimaryDomainModalCallback,
    }),
    [setShowPrimaryDomainModal, PrimaryDomainModalCallback],
  );
}
