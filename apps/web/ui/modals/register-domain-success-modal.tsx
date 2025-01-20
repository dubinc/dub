import { Button, Modal, useRouterStuff } from "@dub/ui";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("../ui/modals");

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
        <div className="px-6 py-8 sm:px-12">
          <div className="relative text-center">
            <h1 className="text-base font-medium text-gray-950">
              {t("congratulations-claim-success")}
            </h1>
            <p
              className="animate-gradient-move font-display mt-4 bg-clip-text text-xl font-semibold text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #7c3aed, #db2777, #7c3aed, #db2777, #7c3aed)",
                backgroundSize: "200% 100%",
              }}
            >
              {registered}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              {t("domain-registered-propagation-info", {
                component0: (
                  <a
                    href="https://dub.co/help/article/free-dot-link-domain#claim-your-domain-and-wait-for-it-to-be-provisioned"
                    target="_blank"
                    className="underline transition-colors hover:text-gray-700"
                  >
                    {t("domain-registered-propagation-info_component0")}
                  </a>
                ),
              })}
            </p>
          </div>
          <div className="mt-8">
            <Button
              type="button"
              variant="primary"
              text={t("start-using-domain")}
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
