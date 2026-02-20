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
  socialContentRequirementsMet: boolean;
  setSocialContentRequirementsMet: Dispatch<SetStateAction<boolean>>;
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
  const [socialContentRequirementsMet, setSocialContentRequirementsMet] =
    useState(true);

  return (
    <ClaimBountyContext.Provider
      value={{
        socialContentVerifying,
        setSocialContentVerifying,
        socialContentRequirementsMet,
        setSocialContentRequirementsMet,
      }}
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
