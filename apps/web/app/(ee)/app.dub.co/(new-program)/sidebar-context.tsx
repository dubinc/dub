"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const {
    slug: workspaceSlug,
    defaultProgramId,
    partnersEnabled,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspace();

  if (workspaceError && workspaceError.status === 404) {
    notFound();
  } else if (workspaceLoading) {
    return <LayoutLoader />;
  }

  if (!partnersEnabled) {
    router.push(`/${workspaceSlug}`);
  }

  if (defaultProgramId) {
    router.push(`/${workspaceSlug}/program`);
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
