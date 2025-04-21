import { Logo } from "@/ui/shared/logo.tsx";
import Link from "next/link";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* @USEFUL_FEATURE: help center toolbar */}
      {/*<Toolbar />*/}
      {/* @USEFUL_FEATURE: theme background */}
      {/*<NewBackground />*/}
      <div className="relative flex min-h-screen w-full justify-center">
        <Link href="/" className="absolute left-4 top-3 z-10">
          {/*<Wordmark className="h-6" />*/}
          <Logo />
        </Link>
        {children}
      </div>
    </>
  );
}
