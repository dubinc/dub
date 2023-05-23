"use client";

import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
} from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import useProject from "@/lib/swr/use-project";
import { useTagLinkModal } from "@/components/app/modals/tag-link-modal";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowTagLinkModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowTagLinkModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { error } = useProject();

  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal({});
  const { setShowTagLinkModal, TagLinkModal } = useTagLinkModal({});

  // handle errors
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

  return (
    <ModalContext.Provider
      value={{
        setShowAddProjectModal,
        setShowAddEditDomainModal,
        setShowTagLinkModal,
      }}
    >
      <AddProjectModal />
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <AddEditDomainModal />
      <TagLinkModal />
      {children}
    </ModalContext.Provider>
  );
}
