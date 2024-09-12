import { Button, Modal, useRouterStuff } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ModalHero } from "../shared/modal-hero";

interface RegisterDomainSuccessProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const RegisterDomainSuccess = ({
  showModal,
  setShowModal,
}: RegisterDomainSuccessProps) => {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      onClose={() => queryParams({ del: "registered" })}
    >
      <div className="flex flex-col">
        <ModalHero />
        <div className="px-12 py-8">
          <div className="relative text-center">
            <h1 className="text-base font-medium text-gray-950">
              Congratulations on claiming
            </h1>
            <p
              className="animate-gradient-move mt-4 bg-clip-text text-lg font-semibold text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #7c3aed, #db2777, #7c3aed, #db2777, #7c3aed)",
                backgroundSize: "200% 100%",
              }}
            >
              {registered}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Your domain is now registered and ready to use.
            </p>
          </div>
          <div className="mt-8">
            <Button
              type="button"
              variant="primary"
              text="Start using your domain"
              className="mt-2"
              onClick={() =>
                queryParams({
                  del: "registered",
                })
              }
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export function useRegisterDomainSuccessModal() {
  const [showRegisterDomainSuccessModal, setShowRegisterDomainSuccessModal] =
    useState(false);

  const RegisterDomainSuccessModal = useCallback(() => {
    return (
      <RegisterDomainSuccess
        showModal={showRegisterDomainSuccessModal}
        setShowModal={setShowRegisterDomainSuccessModal}
      />
    );
  }, [showRegisterDomainSuccessModal, setShowRegisterDomainSuccessModal]);

  return useMemo(
    () => ({ setShowRegisterDomainSuccessModal, RegisterDomainSuccessModal }),
    [setShowRegisterDomainSuccessModal, RegisterDomainSuccessModal],
  );
}
