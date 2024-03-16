import { Logo, MaxWidthWrapper } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="sticky left-0 right-0 top-0 z-20 border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex h-16 items-center justify-start">
            <Link href="/">
              <Logo className="h-8 w-8 transition-all duration-75 active:scale-95" />
            </Link>
          </div>
        </MaxWidthWrapper>
      </div>
      {children}
    </div>
  );
}
