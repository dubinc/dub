import { ReactNode, createContext, useContext, useState } from "react";
import { WorkspaceProps } from "../types";

interface SelectedWorkspaceContextProps {
  selectedWorkspace: WorkspaceProps | null;
  setSelectedWorkspace: (workspace: WorkspaceProps | null) => void;
}

const SelectedWorkspaceContext = createContext<
  SelectedWorkspaceContextProps | undefined
>(undefined);

export const SelectedWorkspaceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<WorkspaceProps | null>(null);

  return (
    <SelectedWorkspaceContext.Provider
      value={{ selectedWorkspace, setSelectedWorkspace }}
    >
      {children}
    </SelectedWorkspaceContext.Provider>
  );
};

export const useSelectedWorkspace = (): SelectedWorkspaceContextProps => {
  const context = useContext(SelectedWorkspaceContext);
  if (!context) {
    throw new Error(
      "useSelectedWorkspace must be used within a SelectedWorkspaceProvider",
    );
  }
  return context;
};
