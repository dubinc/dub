import { Footer } from "@/ui/landing/footer";
import { Header } from "@/ui/landing/header.tsx";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-neutral-50/80">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
