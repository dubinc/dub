import HelpPortal from "@/ui/layout/help";
import { Background } from "@dub/ui";
import { ReactNode } from "react";
import Providers from "../(dashboard)/providers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <HelpPortal />
      <Background />
      <div className="relative z-10 flex min-h-screen w-screen justify-center">
        {children}
      </div>
    </Providers>
  );
}
