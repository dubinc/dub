import Toolbar from "@/ui/layout/toolbar/toolbar";
import { Background } from "@dub/ui";
import Providers from "app/providers";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Toolbar />
      <Background />
      <div className="relative z-10 flex min-h-screen w-full justify-center">
        {children}
      </div>
    </Providers>
  );
}
