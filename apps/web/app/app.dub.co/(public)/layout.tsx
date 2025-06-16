import { Header } from "@/ui/landing/components/header.tsx";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50/80">
      <Header />
      {children}
    </div>
  );
}
