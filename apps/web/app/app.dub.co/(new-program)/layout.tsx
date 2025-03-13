"use client";

import { FormWrapper } from "./form-wrapper";
import { Header } from "./header";
import { SidebarProvider } from "./sidebar-context";
import { Steps } from "./steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white">
        <FormWrapper>
          <Header />
          <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
            <Steps />
            <main className="px-4 py-6 md:px-8">{children}</main>
          </div>
        </FormWrapper>
      </div>
    </SidebarProvider>
  );
}
