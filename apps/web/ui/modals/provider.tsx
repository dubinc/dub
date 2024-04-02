"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SimpleLinkProps } from "@/lib/types";
import { useAcceptInviteModal } from "@/ui/modals/accept-invite-modal";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { useAddWorkspaceModal } from "@/ui/modals/add-workspace-modal";
import { useCompleteSetupModal } from "@/ui/modals/complete-setup-modal";
import { useImportBitlyModal } from "@/ui/modals/import-bitly-modal";
import { useImportShortModal } from "@/ui/modals/import-short-modal";
import { useUpgradePlanModal } from "@/ui/modals/upgrade-plan-modal";
import { useCookies } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useImportRebrandlyModal } from "./import-rebrandly-modal";
import { useAddEditTagModal } from "./add-edit-tag-modal";

export const ModalContext = createContext<{
  setShowAddWorkspaceModal: Dispatch<SetStateAction<boolean>>;
  setShowCompleteSetupModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setShowImportRebrandlyModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddWorkspaceModal: () => {},
  setShowCompleteSetupModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowAddEditLinkModal: () => {},
  setShowAddEditTagModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setShowImportRebrandlyModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AddWorkspaceModal, setShowAddWorkspaceModal } =
    useAddWorkspaceModal();
  const { CompleteSetupModal, setShowCompleteSetupModal } =
    useCompleteSetupModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowAddEditTagModal, AddEditTagModal } = useAddEditTagModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();
  const { setShowImportBitlyModal, ImportBitlyModal } = useImportBitlyModal();
  const { setShowImportShortModal, ImportShortModal } = useImportShortModal();
  const { setShowImportRebrandlyModal, ImportRebrandlyModal } =
    useImportRebrandlyModal();

  const [hashes, setHashes] = useCookies<SimpleLinkProps[]>("hashes__dub", [], {
    domain: !!process.env.NEXT_PUBLIC_VERCEL_URL ? ".dub.co" : undefined,
  });

  const { id, error } = useWorkspace();

  useEffect(() => {
    if (hashes.length > 0 && id) {
      toast.promise(
        fetch(`/api/links/sync?workspaceId=${id}`, {
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
            setHashes([]);
          }
        }),
        {
          loading: "Importing links...",
          success: "Links imported successfully!",
          error: "Something went wrong while importing links.",
        },
      );
    }
  }, [hashes, id]);

  // handle invite and oauth modals
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

  const searchParams = useSearchParams();

  // handle ?newWorkspace and ?newLink query params
  useEffect(() => {
    if (searchParams.has("newWorkspace")) {
      setShowAddWorkspaceModal(true);
    }
    if (searchParams.has("newLink")) {
      setShowAddEditLinkModal(true);
    }
  }, []);

  return (
    <ModalContext.Provider
      value={{
        setShowAddWorkspaceModal,
        setShowCompleteSetupModal,
        setShowAddEditDomainModal,
        setShowAddEditLinkModal,
        setShowAddEditTagModal,
        setShowUpgradePlanModal,
        setShowImportBitlyModal,
        setShowImportShortModal,
        setShowImportRebrandlyModal,
      }}
    >
      <AddWorkspaceModal />
      <AcceptInviteModal />
      <CompleteSetupModal />
      <AddEditDomainModal />
      <AddEditLinkModal />
      <AddEditTagModal />
      <UpgradePlanModal />
      <ImportBitlyModal />
      <ImportShortModal />
      <ImportRebrandlyModal />
      {children}
    </ModalContext.Provider>
  );
}
