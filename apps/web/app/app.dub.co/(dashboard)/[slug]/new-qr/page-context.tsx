"use client";

import { PageContent } from "@/ui/layout/page-content";
import { createContext, ReactNode, useContext, useState } from "react";
import { STEPS } from "./constants.ts";

const PageContext = createContext<{
  title: string;
  setTitle: (title: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: typeof STEPS;
}>({
  title: STEPS.newQR.title,
  setTitle: () => {},
  currentStep: STEPS.newQR.step,
  setCurrentStep: () => {},
  steps: STEPS,
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>(STEPS.newQR.title);
  const [currentStep, setCurrentStep] = useState<number>(STEPS.newQR.step);

  return (
    <PageContext.Provider
      value={{ title, setTitle, currentStep, setCurrentStep, steps: STEPS }}
    >
      <PageContent title={title} hasNavigation>
        {children}
      </PageContent>
    </PageContext.Provider>
  );
}

export function usePageContext() {
  return useContext(PageContext);
}
