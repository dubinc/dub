"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ClaimBountyContextValue = {
  socialContentVerifying: boolean;
  socialContentRequirementsMet: boolean;
  setSocialContentVerifying: (slot: number, value: boolean) => void;
  setSocialContentRequirementsMet: (slot: number, value: boolean) => void;
  resetSocialContentState: () => void;
};

const ClaimBountyContext = createContext<ClaimBountyContextValue | undefined>(
  undefined,
);

export function ClaimBountyProvider({
  socialUrlSlotCount = 0,
  children,
}: {
  socialUrlSlotCount?: number;
  children: React.ReactNode;
}) {
  const [verifyingBySlot, setVerifyingBySlot] = useState<
    Record<number, boolean>
  >({});
  const [requirementsMetBySlot, setRequirementsMetBySlot] = useState<
    Record<number, boolean>
  >({});

  const setSocialContentVerifying = useCallback(
    (slot: number, value: boolean) => {
      setVerifyingBySlot((prev) =>
        prev[slot] === value ? prev : { ...prev, [slot]: value },
      );
    },
    [],
  );

  const setSocialContentRequirementsMet = useCallback(
    (slot: number, value: boolean) => {
      setRequirementsMetBySlot((prev) =>
        prev[slot] === value ? prev : { ...prev, [slot]: value },
      );
    },
    [],
  );

  const resetSocialContentState = useCallback(() => {
    setVerifyingBySlot({});
    setRequirementsMetBySlot({});
  }, []);

  const socialContentVerifying = useMemo(
    () =>
      Array.from(
        { length: socialUrlSlotCount },
        (_, i) => verifyingBySlot[i],
      ).some(Boolean),
    [socialUrlSlotCount, verifyingBySlot],
  );

  const socialContentRequirementsMet = useMemo(
    () =>
      socialUrlSlotCount === 0 ||
      Array.from(
        { length: socialUrlSlotCount },
        (_, i) => requirementsMetBySlot[i] === true,
      ).every(Boolean),
    [socialUrlSlotCount, requirementsMetBySlot],
  );

  return (
    <ClaimBountyContext.Provider
      value={{
        socialContentVerifying,
        socialContentRequirementsMet,
        setSocialContentVerifying,
        setSocialContentRequirementsMet,
        resetSocialContentState,
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
