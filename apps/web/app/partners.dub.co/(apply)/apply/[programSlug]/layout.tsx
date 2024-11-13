import { Wordmark } from "@dub/ui";
import { PropsWithChildren } from "react";

export default function ApplyLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative">
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-screen-sm bg-white">
        <div className="pointer-events-none absolute left-0 top-0 h-screen w-full border-x border-gray-200 [mask-image:linear-gradient(black,transparent)]" />
        {children}
        {/* Footer */}
        <footer className="mt-14 flex flex-col items-center gap-4 py-6 text-center text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            Powered by <Wordmark className="h-3.5" />
          </span>
          <span className="flex items-center gap-2">
            <a
              href="https://dub.co/legal/terms"
              target="_blank"
              className="transition-colors duration-75 hover:text-neutral-600"
            >
              Terms of Service
            </a>
            <span className="text-base text-neutral-200">&bull;</span>
            <a
              href="https://dub.co/legal/privacy"
              target="_blank"
              className="transition-colors duration-75 hover:text-neutral-600"
            >
              Privacy Policy
            </a>
          </span>
        </footer>
      </div>

      {/* Background grid */}
      <div className="absolute inset-0 flex h-fit w-full items-center justify-center">
        <img
          src="https://assets.dub.co/misc/program-apply-grid.svg"
          alt=""
          width={1280}
          height={480}
          className="[mask-image:radial-gradient(70%_100%_at_50%_0%,black_30%,transparent)]"
        />
      </div>
    </div>
  );
}
