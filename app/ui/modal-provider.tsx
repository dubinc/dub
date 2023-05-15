"use client";

import { Dispatch, ReactNode, SetStateAction, createContext } from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();

  return (
    <ModalContext.Provider value={{ setShowAddProjectModal }}>
      <AddProjectModal />
      {children}
    </ModalContext.Provider>
  );
}
