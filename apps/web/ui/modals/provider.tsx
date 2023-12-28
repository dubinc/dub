"use client";

import useProject from "@/lib/swr/use-project";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { useAddProjectModal } from "@/ui/modals/add-project-modal";
import { useCompleteSetupModal } from "@/ui/modals/complete-setup-modal";
import { useImportBitlyModal } from "@/ui/modals/import-bitly-modal";
import { useImportShortModal } from "@/ui/modals/import-short-modal";
import { useUpgradePlanModal } from "@/ui/modals/upgrade-plan-modal";
import { useAcceptInviteModal } from "@/ui/modals/accept-invite-modal";
import { useParams } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
} from "react";
import { mutate } from "swr";
import { useCookies } from "@dub/ui";
import { SimpleLinkProps } from "@/lib/types";
import { toast } from "sonner";
import { useImportRebrandlyModal } from "./import-rebrandly-modal";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setShowImportRebrandlyModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowCompleteSetupModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowAddEditLinkModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setShowImportRebrandlyModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();
  const { setShowImportBitlyModal, ImportBitlyModal } = useImportBitlyModal();
  const { setShowImportShortModal, ImportShortModal } = useImportShortModal();
  const { setShowImportRebrandlyModal, ImportRebrandlyModal } =
    useImportRebrandlyModal();

  const params = useParams() as { slug?: string };

  const [hashes, setHashes] = useCookies<SimpleLinkProps[]>("hashes__dub", [], {
    domain: !!process.env.NEXT_PUBLIC_VERCEL_URL ? ".dub.co" : undefined,
  });

  useEffect(() => {
    if (hashes.length > 0) {
      fetch("/api/links/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hashes),
      }).then(async (res) => {
        if (res.status === 200) {
          await mutate(
            (key) => typeof key === "string" && key.startsWith("/api/links"),
            undefined,
            { revalidate: true },
          );
          toast.success("Links imported successfully!");
        }
        setHashes([]);
      });
    }
  }, [hashes]);

  const { error } = useProject();

  // handle invite and oauth modals
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

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
        setShowImportRebrandlyModal,
      }}
    >
      <AddProjectModal />
      <AcceptInviteModal />
      <CompleteSetupModal />
      <AddEditDomainModal />
      <AddEditLinkModal />
      <UpgradePlanModal />
      <ImportBitlyModal />
      <ImportShortModal />
      <ImportRebrandlyModal />
      {children}
    </ModalContext.Provider>
  );
}
