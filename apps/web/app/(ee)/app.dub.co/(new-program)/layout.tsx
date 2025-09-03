"use client";

import { FormWrapper } from "./form-wrapper";
import { ProgramOnboardingHeader } from "./header";
import { SidebarProvider } from "./sidebar-context";
import { ProgramOnboardingSteps } from "./steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white">
        <FormWrapper>
          <ProgramOnboardingHeader />
          <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
            <ProgramOnboardingSteps />
            <main className="px-4 py-6 md:px-8">{children}</main>
          </div>
        </FormWrapper>
      </div>
    </SidebarProvider>
  );
}
