import { NewBackground } from "@/ui/shared/new-background";
import { Wordmark } from "@dub/ui";
import Link from "next/link";
import { NotFoundHint } from "./not-found-hint";

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
        <NotFoundHint />
      </div>
      <NewBackground showAnimation />
    </>
  );
}
