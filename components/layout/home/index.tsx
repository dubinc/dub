import Image from "next/future/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Github, Logo, Twitter } from "@/components/shared/icons";
import Meta from "../meta";

export default function HomeLayout({
  children,
  domain,
}: {
  children: ReactNode;
  domain?: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { key } = router.query as { key?: string };
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Meta />
      <div className={`${key ? "bg-gray-50" : ""} z-20`}>
        <div className="mx-auto max-w-screen-xl px-5 md:px-20">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              {domain ? (
                <a href="https://dub.sh" target="_blank" rel="noreferrer">
                  <Image
                    src="/_static/logotype.svg"
                    alt="Dub.sh logo"
                    width={834}
                    height={236}
                    className="w-24"
                  />
                </a>
              ) : (
                <Link href="/">
                  <a>
                    <Image
                      src="/_static/logotype.svg"
                      alt="Dub.sh logo"
                      width={834}
                      height={236}
                      className="w-24"
                    />
                  </a>
                </Link>
              )}
            </div>
            {session ? (
              <a
                href="https://app.dub.sh"
                className="rounded-full border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Dashboard
              </a>
            ) : (
              <a
                href="https://app.dub.sh/login"
                className="rounded-full border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </div>
      {children}
      <div className="z-10 flex h-20 items-center justify-center space-x-12 border-t border-gray-200">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="h-6 w-6 text-gray-600" />
        </a>
        {domain ? (
          <a href="https://dub.sh" target="_blank" rel="noreferrer">
            <span className="sr-only">Dub.sh Logo</span>
            <Logo className="h-7 w-7 text-gray-600" />
          </a>
        ) : (
          <Link href="/">
            <a>
              <span className="sr-only">Dub.sh Logo</span>
              <Logo className="h-7 w-7 text-gray-600" />
            </a>
          </Link>
        )}
        <a
          href="https://github.com/steven-tey/dub"
          target="_blank"
          rel="noreferrer"
        >
          <span className="sr-only">Github</span>
          <Github className="h-6 w-6 text-gray-600" />
        </a>
      </div>
    </div>
  );
}
