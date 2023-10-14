"use client";

import { useAddEditDomainModal } from "#/ui/modals/add-edit-domain-modal";
import { useAddEditLinkModal } from "#/ui/modals/add-edit-link-modal";
import { useAddProjectModal } from "#/ui/modals/add-project-modal";
import { useCompleteSetupModal } from "#/ui/modals/complete-setup-modal";
import { useImportBitlyModal } from "#/ui/modals/import-bitly-modal";
import { useImportShortModal } from "#/ui/modals/import-short-modal";
import { useUpgradePlanModal } from "#/ui/modals/upgrade-plan-modal";
import { getQueryString } from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";
import { mutate } from "swr";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setPollLinks: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowCompleteSetupModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowAddEditLinkModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setPollLinks: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();
  const { setShowImportBitlyModal, ImportBitlyModal } = useImportBitlyModal();
  const { setShowImportShortModal, ImportShortModal } = useImportShortModal();

  const params = useParams() as { slug?: string };
  const { slug } = params;
  const searchParams = useSearchParams();

  // special link polling setup to poll links as they're being created (for bitly import)
  const [pollLinks, setPollLinks] = useState(false);
  useEffect(() => {
    if (pollLinks) {
      // if pollLinks is true, start polling links endpoint every 500 ms (stop after 20 seconds)
      const pollingInterval = setInterval(() => {
        mutate(
          `/api/links${getQueryString({
            params,
            searchParams,
          })}`,
        );
        mutate(`/api/projects/${slug}/tags`);
        mutate(
          (key) =>
            typeof key === "string" && key.startsWith(`/api/links/_count`),
          undefined,
          { revalidate: true },
        );
      }, 500);
      setTimeout(() => {
        setPollLinks(false);
        clearInterval(pollingInterval);
      }, 20000);
    }
  }, [pollLinks]);

  return (
    <ModalContext.Provider
      value={{
        setShowAddProjectModal,
        setShowCompleteSetupModal,
        setShowAddEditDomainModal,
        setShowAddEditLinkModal,
        setShowUpgradePlanModal,
        setShowImportBitlyModal,
        setShowImportShortModal,
        setPollLinks,
      }}
    >
      <AddProjectModal />
      <CompleteSetupModal />
      <AddEditDomainModal />
      <AddEditLinkModal />
      <UpgradePlanModal />
      <ImportBitlyModal />
      <ImportShortModal />
      {children}
    </ModalContext.Provider>
  );
}
