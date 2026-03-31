"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { redirect } from "next/navigation";
import { createContext, ReactNode, useContext, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    slug: workspaceSlug,
    defaultProgramId,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspace();

  if (workspaceError && workspaceError.status === 404) {
    redirect("/account/settings");
  } else if (workspaceLoading) {
    return <LayoutLoader />;
  }

  if (defaultProgramId) {
    redirect(`/${workspaceSlug}/program`);
  }

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}
