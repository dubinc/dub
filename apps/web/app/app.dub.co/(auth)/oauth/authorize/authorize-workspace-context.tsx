"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

const AuthorizeWorkspaceContext = createContext<{
  selectedWorkspace: string | null;
  setSelectedWorkspace: Dispatch<SetStateAction<string | null>>;
} | null>(null);

// Shares the selected workspace between the scopes list and the authorize form
// so missing-scope warnings update when the workspace changes.
export function AuthorizeWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );

  return (
    <AuthorizeWorkspaceContext.Provider
      value={{ selectedWorkspace, setSelectedWorkspace }}
    >
      {children}
    </AuthorizeWorkspaceContext.Provider>
  );
}

export function useAuthorizeWorkspace() {
  const context = useContext(AuthorizeWorkspaceContext);

  if (!context) {
    throw new Error(
      "useAuthorizeWorkspace must be used within AuthorizeWorkspaceProvider",
    );
  }

  return context;
}
