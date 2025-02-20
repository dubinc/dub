import { Button, Wordmark } from "@dub/ui";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";
import { Steps } from "./onboarding/(steps)/steps";

export default function Layout({
  children,
  title = "Create partner program",
}: PropsWithChildren<{
  title?: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Wordmark className="h-7" />
          </Link>
          <div className="h-6 w-px bg-neutral-200" />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button text="Cancel" variant="outline" className="h-7 w-auto" />
          <Button
            text="Save and exit"
            variant="secondary"
            className="h-7 w-auto"
          />
        </div>
      </header>

      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <Steps />
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
