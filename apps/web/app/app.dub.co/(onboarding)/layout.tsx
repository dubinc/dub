import { CircleQuestion } from "@dub/ui";
import { PropsWithChildren } from "react";
import { SignedInHint } from "./signed-in-hint";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <div className="hidden md:block">
        <SignedInHint />
      </div>
      <a
        href="https://dub.co/contact/support"
        target="_blank"
        className="fixed bottom-0 right-0 z-40 m-5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 md:flex"
        aria-label="Help"
      >
        <CircleQuestion className="size-5" strokeWidth={2} />
      </a>
    </>
  );
}
