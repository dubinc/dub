"use client";

import usePrograms from "@/lib/swr/use-programs";
import useWorkspace from "@/lib/swr/use-workspace";
import { notFound, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useState } from "react";
import LayoutLoader from "../(dashboard)/loading";

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
    partnersEnabled,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspace();

  const { programs, loading: programsLoading } = usePrograms();

  if (workspaceError && workspaceError.status === 404) {
    notFound();
  } else if (workspaceLoading || programsLoading) {
    return <LayoutLoader />;
  }

  if (!partnersEnabled) {
    router.push(`/${workspaceSlug}`);
  }

  if (programs && programs.length > 0) {
    router.push(`/${workspaceSlug}/programs/${programs[0].id}`);
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
