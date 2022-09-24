import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Meta from "../meta";
import Image from "next/future/image";
import { Github, Logo, Twitter } from "@/components/shared/icons";

export default function HomeLayout({
  children,
  domain,
}: {
  children: ReactNode;
  domain?: string;
}) {
  const { data: session } = useSession();
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Meta />
      <div className="bg-white z-20">
        <div className="max-w-screen-xl mx-auto px-5 sm:px-20">
          <div className="h-16 flex justify-between items-center">
            <div className="flex items-center">
              {domain ? (
                <a href="https://dub.sh" target="_blank" rel="noreferrer">
                  <Image
                    src="/static/logotype.svg"
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
                      src="/static/logotype.svg"
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
                className="py-1.5 px-5 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all"
              >
                Dashboard
              </a>
            ) : (
              <a
                href="https://app.dub.sh/login"
                className="py-1.5 px-5 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </div>
      {children}
      <div className="border-t border-gray-200 h-20 flex items-center justify-center space-x-12">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="w-6 h-6 text-gray-600" />
        </a>
        {domain ? (
          <a href="https://dub.sh" target="_blank" rel="noreferrer">
            <span className="sr-only">Dub.sh Logo</span>
            <Logo className="w-7 h-7 text-gray-600" />
          </a>
        ) : (
          <Link href="/">
            <a>
              <span className="sr-only">Dub.sh Logo</span>
              <Logo className="w-7 h-7 text-gray-600" />
            </a>
          </Link>
        )}
        <a
          href="https://github.com/steven-tey/dub"
          target="_blank"
          rel="noreferrer"
        >
          <span className="sr-only">Github</span>
          <Github className="w-6 h-6 text-gray-600" />
        </a>
      </div>
    </div>
  );
}
