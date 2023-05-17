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

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { error } = useProject();

  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();

  // handle errors
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

  return (
    <ModalContext.Provider value={{ setShowAddProjectModal }}>
      <AddProjectModal />
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      {children}
    </ModalContext.Provider>
  );
}
