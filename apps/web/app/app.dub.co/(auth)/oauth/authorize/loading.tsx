import { Logo } from "@dub/ui";
import { ArrowLeftRight } from "lucide-react";

export default function AuthorizeLoading() {
  return (
    <div className="relative z-10 mx-4 my-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl sm:mx-auto">
      <div className="flex flex-col items-center justify-center gap-3 border-b border-neutral-200 px-4 py-6 pt-8 text-center sm:rounded-t-2xl sm:px-16">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100" />
          <ArrowLeftRight className="size-5 text-neutral-300" />
          <Logo className="size-12 text-neutral-700" />
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="flex flex-col space-y-3 px-4 py-6 sm:px-10">
        <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="flex flex-col space-y-2 border-t border-neutral-200 px-4 py-6 sm:rounded-b-2xl sm:px-10">
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 w-full animate-pulse rounded bg-neutral-200" />
        <div className="flex gap-4">
          <div className="h-10 w-1/2 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 w-1/2 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
