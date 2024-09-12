import { Modal, useRouterStuff } from "@dub/ui";
import { useCallback, useMemo, useState } from "react";
import { RegisterDomainForm } from "../domains/register-domain-form";

interface RegisterDomainProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const RegisterDomain = ({ showModal, setShowModal }: RegisterDomainProps) => {
  const { queryParams } = useRouterStuff();

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Claim .link domain
      </h3>
      <RegisterDomainForm
        onSuccess={(domain) => {
          setShowModal(false);
          queryParams({ set: { registered: domain.toLowerCase() } });
        }}
        onCancel={() => setShowModal(false)}
      />
    </Modal>
  );
};

export function useRegisterDomainModal() {
  const [showRegisterDomainModal, setShowRegisterDomainModal] = useState(false);

  const RegisterDomainModal = useCallback(() => {
    return (
      <RegisterDomain
        showModal={showRegisterDomainModal}
        setShowModal={setShowRegisterDomainModal}
      />
    );
  }, [showRegisterDomainModal, setShowRegisterDomainModal]);

  return useMemo(
    () => ({ setShowRegisterDomainModal, RegisterDomainModal }),
    [setShowRegisterDomainModal, RegisterDomainModal],
  );
}
