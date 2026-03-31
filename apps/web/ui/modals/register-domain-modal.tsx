import { Modal, useRouterStuff } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { RegisterDomainForm } from "../domains/register-domain-form";

interface RegisterDomainProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (domain: string) => void;
  setRegisteredParam?: boolean;
}

const RegisterDomain = ({
  showModal,
  setShowModal,
  onSuccess,
  setRegisteredParam,
}: RegisterDomainProps) => {
  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      drawerRootProps={{ repositionInputs: false }}
    >
      <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
        Claim .link domain
      </h3>
      <div className="scrollbar-hide mt-6 max-h-[calc(100dvh-200px)] overflow-auto overflow-y-scroll">
        <RegisterDomainForm
          variant="modal"
          onSuccess={(domain) => {
            onSuccess?.(domain);
            setShowModal(false);

            if (setRegisteredParam !== false)
              queryParams({ set: { registered: domain.toLowerCase() } });
          }}
          onCancel={() => setShowModal(false)}
        />
      </div>
    </Modal>
  );
};

export function useRegisterDomainModal(
  props: Omit<RegisterDomainProps, "showModal" | "setShowModal"> = {},
) {
  const [showRegisterDomainModal, setShowRegisterDomainModal] = useState(false);

  const RegisterDomainModal = useCallback(() => {
    return (
      <RegisterDomain
        showModal={showRegisterDomainModal}
        setShowModal={setShowRegisterDomainModal}
        {...props}
      />
    );
  }, [showRegisterDomainModal, setShowRegisterDomainModal, props]);

  return useMemo(
    () => ({ setShowRegisterDomainModal, RegisterDomainModal }),
    [setShowRegisterDomainModal, RegisterDomainModal],
  );
}
