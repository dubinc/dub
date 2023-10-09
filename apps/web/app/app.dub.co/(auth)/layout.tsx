import { Background } from "@dub/ui";
import { ReactNode } from "react";

export const runtime = "edge";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen justify-center">
      <Background />
      {children}
    </div>
  );
}
