"use client";

import { ProgramOnboardingFormWrapper } from "@/ui/partners/program-onboarding-form-wrapper";
import { ProgramOnboardingHeader } from "./header";
import { SidebarProvider } from "./sidebar-context";
import { ProgramOnboardingSteps } from "./steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white">
        <ProgramOnboardingFormWrapper>
          <ProgramOnboardingHeader />
          <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
            <ProgramOnboardingSteps />
            <main className="px-4 py-6 lg:px-8">{children}</main>
          </div>
        </ProgramOnboardingFormWrapper>
      </div>
    </SidebarProvider>
  );
}
