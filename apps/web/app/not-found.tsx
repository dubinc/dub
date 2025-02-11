import { NewBackground } from "@/ui/shared/new-background";
import { Wordmark } from "@dub/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <div className="relative z-10 flex h-screen w-screen flex-col items-center justify-center gap-6">
        <Link href="/" className="absolute left-4 top-3">
          <Wordmark className="h-6" />
        </Link>
        <h1 className="font-display bg-gradient-to-r from-black to-neutral-600 bg-clip-text text-5xl font-semibold text-transparent">
          404
        </h1>
        <Link
          href="/"
          className="flex h-9 w-fit items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white hover:bg-neutral-800 hover:ring-4 hover:ring-neutral-200"
        >
          Go back home
        </Link>
      </div>
      <NewBackground showAnimation />
    </>
  );
}
