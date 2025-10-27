"use client";

import { createContext, useContext, ReactNode } from "react";
import { Session } from '@/lib/auth';

// Create the context
const UserContext = createContext<Session["user"] | null>(null);

// Provider props interface
interface UserProviderProps {
  user: Session["user"];
  children: ReactNode;
}

// Provider component
export function UserProvider({ user, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the context
export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  
  return context;
}

// Export the context for advanced usage if needed
export { UserContext };
