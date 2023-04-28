import Image from "next/image";
import Link from "next/link";
import { Github, Logo, Twitter } from "@/components/shared/icons";
import NavigationMenu from "./navigation-menu";

const title = "Dub - Link Management for Modern Marketing Teams";
const description =
  "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.";

export const metadata = {
  title,
  description,
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@dubdotsh",
  },
  metadataBase: new URL("https://dub.sh"),
  themeColor: "#FFF",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <div className="z-20">
        <div className="mx-auto max-w-screen-xl px-5 md:px-20">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Image
                  src="/_static/logotype.svg"
                  alt="Dub.sh logo"
                  width={834}
                  height={236}
                  className="w-24"
                />
              </Link>
            </div>

            <NavigationMenu />

            <div className="w-24">
              <Link
                href={
                  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
                    ? "https://app.dub.sh/login"
                    : "http://app.localhost:3000/login"
                }
                className="rounded-full border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
      {children}
      <div className="z-10 flex h-20 items-center justify-center space-x-12 border-t border-gray-200">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="h-6 w-6 text-gray-600" />
        </a>
        <Link href="/">
          <span className="sr-only">Dub.sh Logo</span>
          <Logo className="h-7 w-7 text-gray-600" />
        </Link>
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
