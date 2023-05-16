"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import useScroll from "#/lib/hooks/use-scroll";
import clsx from "clsx";

const transparentHeaderSegments = new Set(["metatags"]);

export default function Nav() {
  const { domain = "dub.sh" } = useParams() as { domain: string };

  const scrolled = useScroll(80);
  const segment = useSelectedLayoutSegment();

  return (
    <div
      className={clsx(`sticky inset-x-0 top-0 z-30 w-full transition-all`, {
        "border-b border-gray-200 bg-white/75 backdrop-blur-lg": scrolled,
        "border-b border-gray-200 bg-white":
          segment && !transparentHeaderSegments.has(segment),
      })}
    >
      <div className="mx-auto w-full max-w-screen-xl px-5 md:px-20">
        <div className="flex h-16 items-center justify-between">
          <Link href={domain === "dub.sh" ? "/" : `https://dub.sh`}>
            <Image
              src="/_static/logotype.svg"
              alt="Dub.sh logo"
              width={834}
              height={236}
              className="w-24"
            />
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              href={
                domain === "dub.sh" ? "/metatags" : `https://dub.sh/metatags`
              }
              className={`hidden rounded-md text-sm font-medium ${
                segment === "metatags" ? "text-black" : "text-gray-500"
              } transition-colors ease-out hover:text-black sm:block`}
            >
              Metatags API
            </Link>
            <Link
              href={
                domain === "dub.sh" ? "/changelog" : `https://dub.sh/changelog`
              }
              className={`rounded-md text-sm font-medium ${
                segment === "changelog" ? "text-black" : "text-gray-500"
              } transition-colors ease-out hover:text-black`}
            >
              Changelog
            </Link>
            <Link
              href={
                process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
                  ? "https://app.dub.sh/login"
                  : "http://app.localhost:3000/login"
              }
              className="rounded-full border border-black bg-black px-5 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
