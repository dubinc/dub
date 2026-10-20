"use client";

import { updateProgramEnrollmentPreferences } from "@/lib/actions/partners/update-program-enrollment-preferences";
import {
  defaultPartnerLinksDisplayProperties,
  normalizePartnerLinksDisplayProperties,
  type PartnerLinksDisplayProperty,
} from "@/lib/partners/partner-links-display";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { useAction } from "next-safe-action/hooks";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";

type PartnerLinksDisplayOption = "full" | "cards";

type PartnerLinksDisplayPreferences = {
  displayOption: PartnerLinksDisplayOption;
  displayProperties: PartnerLinksDisplayProperty[];
};

/** Read persisted partner links display prefs (for Analytics / Events / filters). */
export function usePartnerLinksDisplay() {
  const { programEnrollment } = useProgramEnrollment();

  return {
    displayProperties: normalizePartnerLinksDisplayProperties(
      programEnrollment?.partnerPreferences?.linksDisplay?.displayProperties ??
        defaultPartnerLinksDisplayProperties,
    ),
  };
}

type PartnerLinksDisplayContextValue = {
  displayOption: PartnerLinksDisplayOption;
  setDisplayOption: Dispatch<SetStateAction<PartnerLinksDisplayOption>>;
  displayProperties: PartnerLinksDisplayProperty[];
  setDisplayProperties: Dispatch<SetStateAction<PartnerLinksDisplayProperty[]>>;
  isDirty: boolean;
  persist: () => void | Promise<void>;
  reset: () => void;
};

export const PartnerLinksDisplayContext =
  createContext<PartnerLinksDisplayContextValue>({
    displayOption: "full",
    setDisplayOption: () => {},
    displayProperties: defaultPartnerLinksDisplayProperties,
    setDisplayProperties: () => {},
    isDirty: false,
    persist: () => {},
    reset: () => {},
  });

export function PartnerLinksDisplayProvider({
  children,
  linksCount,
  showDetailedAnalytics,
}: PropsWithChildren<{
  linksCount?: number;
  showDetailedAnalytics?: boolean;
}>) {
  const { programEnrollment } = useProgramEnrollment();
  const { executeAsync } = useAction(updateProgramEnrollmentPreferences);

  const persisted = programEnrollment?.partnerPreferences?.linksDisplay ?? null;

  const resolvedPersisted = useMemo<PartnerLinksDisplayPreferences>(() => {
    return {
      displayOption:
        persisted?.displayOption ??
        ((linksCount && linksCount > 5) || !showDetailedAnalytics
          ? "cards"
          : "full"),
      displayProperties: normalizePartnerLinksDisplayProperties(
        persisted?.displayProperties ?? defaultPartnerLinksDisplayProperties,
      ),
    };
  }, [persisted, linksCount, showDetailedAnalytics]);

  const [displayOption, setDisplayOption] = useState<PartnerLinksDisplayOption>(
    resolvedPersisted.displayOption,
  );
  const [displayProperties, setDisplayProperties] = useState<
    PartnerLinksDisplayProperty[]
  >(resolvedPersisted.displayProperties);

  // Sync draft when persisted defaults resolve (e.g. after enrollment/links load)
  useEffect(() => {
    setDisplayOption(resolvedPersisted.displayOption);
    setDisplayProperties(resolvedPersisted.displayProperties);
  }, [resolvedPersisted]);

  const isDirty = useMemo(() => {
    if (displayOption !== resolvedPersisted.displayOption) return true;
    if (
      displayProperties.slice().sort().join(",") !==
      resolvedPersisted.displayProperties.slice().sort().join(",")
    ) {
      return true;
    }
    return false;
  }, [displayOption, displayProperties, resolvedPersisted]);

  const persist = async () => {
    if (!programEnrollment?.programId) return;

    await executeAsync({
      programId: programEnrollment.programId,
      key: "linksDisplay",
      value: {
        displayOption,
        displayProperties,
      },
    });

    const programSlug = programEnrollment.program?.slug;
    if (programSlug) {
      mutate(`/api/partner-profile/programs/${programSlug}`);
    }
  };

  return (
    <PartnerLinksDisplayContext.Provider
      value={{
        displayOption: !showDetailedAnalytics ? "cards" : displayOption,
        setDisplayOption,
        displayProperties,
        setDisplayProperties,
        isDirty,
        persist,
        reset: () => {
          setDisplayOption(resolvedPersisted.displayOption);
          setDisplayProperties(resolvedPersisted.displayProperties);
        },
      }}
    >
      {children}
    </PartnerLinksDisplayContext.Provider>
  );
}
