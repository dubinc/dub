import { MaxWidthWrapper, NavWordmark } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = constructMetadata({ noIndex: true });

const tabs = [
  {
    href: "/links",
    label: "Links",
  },
  {
    href: "/analytics",
    label: "Analytics",
  },
  {
    href: "/revenue",
    label: "Revenue",
  },
  {
    href: "/demo",
    label: "Demo",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="min-h-screen w-full bg-neutral-50">
        <div className="sticky left-0 right-0 top-0 z-20 border-b border-neutral-200 bg-white">
          <MaxWidthWrapper>
            <div className="flex h-16 items-center gap-12">
              <Link href="/">
                <NavWordmark className="h-6" />
              </Link>
              {tabs.map((tab) => (
                <Link
                  href={tab.href}
                  key={tab.href}
                  className="text-sm text-neutral-500"
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </MaxWidthWrapper>
        </div>
        {children}
      </div>
    </>
  );
}
