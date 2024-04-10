"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SimpleLinkProps } from "@/lib/types";
import { useAcceptInviteModal } from "@/ui/modals/accept-invite-modal";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
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
import { pushModal } from ".";
import { useAddEditTagModal } from "./add-edit-tag-modal";
import { useImportRebrandlyModal } from "./import-rebrandly-modal";

export const ModalContext = createContext<{
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setShowImportRebrandlyModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddEditDomainModal: () => {},
  setShowAddEditTagModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setShowImportRebrandlyModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();
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
      pushModal("AddWorkspace");
    }
    if (searchParams.has("newLink")) {
      pushModal("AddEditLink", { props: undefined });
    }
  }, []);

  return (
    <ModalContext.Provider
      value={{
        setShowAddEditDomainModal,
        setShowAddEditTagModal,
        setShowUpgradePlanModal,
        setShowImportBitlyModal,
        setShowImportShortModal,
        setShowImportRebrandlyModal,
      }}
    >
      <AcceptInviteModal />
      <AddEditDomainModal />
      <AddEditTagModal />
      <UpgradePlanModal />
      <ImportBitlyModal />
      <ImportShortModal />
      <ImportRebrandlyModal />
      {children}
    </ModalContext.Provider>
  );
}
