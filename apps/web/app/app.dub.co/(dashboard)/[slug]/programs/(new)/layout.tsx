import { Button, Wordmark } from "@dub/ui";
import RootProviders from "app/providers";
import Link from "next/link";
import { Steps } from "./new/steps";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center">
            <Wordmark className="h-7" />
          </Link>
          <h1 className="hidden text-base font-semibold text-neutral-700 md:block">
            Create partner program
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="group flex h-7 w-auto items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm text-neutral-600 transition-all hover:bg-neutral-100"
          >
            Cancel
          </Link>

          <Button
            text="Save and exit"
            variant="secondary"
            className="h-7 w-auto"
          />
        </div>
      </header>

      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <Steps />
        <main className="px-4 py-6 md:px-8">
          <RootProviders>{children}</RootProviders>
        </main>
      </div>
    </div>
  );
}
