"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

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