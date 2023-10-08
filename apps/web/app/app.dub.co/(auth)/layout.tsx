import { ReactNode } from "react";
import { Background } from "ui";

export const runtime = "edge";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen justify-center">
      <Background />
      {children}
    </div>
  );
}
