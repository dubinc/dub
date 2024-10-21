import Toolbar from "@/ui/layout/toolbar/toolbar";
import { NewBackground } from "@/ui/shared/new-background";
import { Wordmark } from "@dub/ui";
import Providers from "app/providers";
import Link from "next/link";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Toolbar />
      <NewBackground />
      <div className="relative flex min-h-screen w-full justify-center">
        <Link href="/" className="absolute left-4 top-3 z-10">
          <Wordmark className="h-6" />
        </Link>
        {children}
      </div>
    </Providers>
  );
}
