"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

export type ClaimBountyContextValue = {
  socialContentVerifying: boolean;
  setSocialContentVerifying: Dispatch<SetStateAction<boolean>>;
};

const ClaimBountyContext = createContext<ClaimBountyContextValue | undefined>(
  undefined,
);

export function ClaimBountyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [socialContentVerifying, setSocialContentVerifying] = useState(false);

  return (
    <ClaimBountyContext.Provider
      value={{ socialContentVerifying, setSocialContentVerifying }}
    >
      {children}
    </ClaimBountyContext.Provider>
  );
}

export function useClaimBountyContext() {
  const context = useContext(ClaimBountyContext);

  if (!context) {
    throw new Error(
      "useClaimBountyContext must be used within ClaimBountyProvider",
    );
  }

  return context;
}
