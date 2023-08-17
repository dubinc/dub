"use client";

import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import { useImportBitlyModal } from "@/components/app/modals/import-bitly-modal";
import { useImportShortModal } from "@/components/app/modals/import-short-modal";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import { mutate } from "swr";
import { useRouter } from "next/router";
import { getQueryString } from "#/lib/utils";
import { useUpgradePlanModal } from "@/components/app/modals/upgrade-plan-modal";
import { useCompleteSetupModal } from "@/components/app/modals/complete-setup-modal";
import useCMDK from "./cmdk";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setPollLinks: Dispatch<SetStateAction<boolean>>;
  setShowCMDK: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowCompleteSetupModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowAddEditLinkModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setPollLinks: () => {},
  setShowCMDK: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();
  const { CMDK, setShowCMDK } = useCMDK();

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();
  const { setShowImportBitlyModal, ImportBitlyModal } = useImportBitlyModal();
  const { setShowImportShortModal, ImportShortModal } = useImportShortModal();

  const router = useRouter();
  const { slug } = router.query;

  // special link polling setup to poll links as they're being created (for bitly import)
  const [pollLinks, setPollLinks] = useState(false);
  useEffect(() => {
    if (pollLinks) {
      // if pollLinks is true, start polling links endpoint every 500 ms (stop after 20 seconds)
      const pollingInterval = setInterval(() => {
        mutate(`/api/links${getQueryString(router)}`);
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
        setShowCMDK,
      }}
    >
      <CMDK />
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
