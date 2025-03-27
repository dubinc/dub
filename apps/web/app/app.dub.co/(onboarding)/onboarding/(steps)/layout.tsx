import { Wordmark } from "@dub/ui";
import Link from "next/link";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <div className="relative flex flex-col items-center">
        {/* <div className="absolute right-0 top-0">
          <ExitButton />
        </div> */}
        <Link href="https://dub.co/home" target="_blank">
          <Wordmark className="mt-6 h-8" />
        </Link>
        <div className="mt-8 flex w-full flex-col items-center px-3 pb-16 md:mt-20 lg:px-8">
          {children}
        </div>
      </div>
    </>
  );
}
