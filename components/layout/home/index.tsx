import { ReactNode } from "react";
import Link from "next/link";
import Meta from "../meta";
import Image from "next/future/image";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Meta />
      <div className="bg-white z-20">
        <div className="max-w-screen-xl mx-auto px-5 sm:px-20">
          <div className="h-16 flex justify-between items-center my-3">
            <div className="flex items-center">
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
            </div>
            <a
              href="https://app.dub.sh/login"
              className="py-1.5 px-5 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
