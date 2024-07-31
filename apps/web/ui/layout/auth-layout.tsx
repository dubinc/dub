import { BlurImage, Button, ClientOnly, Wordmark } from "@dub/ui";
import Link from "next/link";
import { Suspense } from "react";

const logos = [
  "vercel",
  "perplexity",
  "prisma",
  "tinybird",
  "hashnode",
  "cal",
  "vercel",
  "perplexity",
  "prisma",
  "tinybird",
  "hashnode",
  "cal",
];

export default function AuthLayout({
  variant,
  children,
}: {
  variant: "login" | "register";
  children: React.ReactNode;
}) {
  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-5">
      <div className="col-span-1 flex min-h-screen flex-col items-center justify-between border-r border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur sm:col-span-3">
        <div className="flex h-full w-full flex-col items-center justify-center">
          {/* Use ClientOnly because the login form relies on local storage for its initial render */}
          <ClientOnly className="relative flex w-full flex-col items-center justify-center">
            <Wordmark className="mb-8 h-12" />
            <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
              <div className="border-b border-gray-200 bg-white pb-6 pt-8 text-center">
                <h3 className="text-lg font-semibold">
                  {variant === "login"
                    ? "Sign in to your Dub account"
                    : "Get started with Dub"}
                </h3>
              </div>
              <div className="flex flex-col bg-gray-50 px-4 py-8 sm:px-16">
                <div className="space-y-3">
                  <Suspense
                    fallback={
                      <>
                        <Button disabled={true} variant="secondary" />
                        <Button disabled={true} variant="secondary" />
                        <Button disabled={true} variant="secondary" />
                        <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
                      </>
                    }
                  >
                    {children}
                  </Suspense>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
              {variant === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <Link
                href={`/${variant === "login" ? "register" : "login"}`}
                className="font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-black"
              >
                {variant === "login" ? "Sign up" : "Sign in"}
              </Link>
            </p>
          </ClientOnly>
        </div>
        <div className="grid gap-2 pb-8 pt-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Dub Technologies, Inc.
          </p>
          <div className="flex gap-3 text-center text-xs text-gray-500 underline underline-offset-2">
            <a
              href="https://dub.co/privacy"
              target="_blank"
              className="hover:text-gray-800"
            >
              Privacy Policy
            </a>
            <a
              href="https://dub.co/terms"
              target="_blank"
              className="hover:text-gray-800"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
      <div className="hidden h-full flex-col justify-center space-y-12 overflow-hidden md:col-span-2 md:flex">
        <a
          href="https://dub.co/features/analytics"
          target="_blank"
          className="ml-12 h-1/2 w-[112%] rounded-xl border border-gray-200 p-2 shadow-xl"
        >
          <BlurImage
            alt="Dub.co Analytics"
            src="https://assets.dub.co/compare/dub-analytics.png"
            width={3236}
            height={1618}
            className="h-full rounded-lg border border-gray-200 object-cover"
          />
        </a>
        <a
          href="https://dub.co/customers"
          target="_blank"
          className="animate-infinite-scroll flex items-center space-x-4"
        >
          {logos.map((logo, idx) => (
            <BlurImage
              alt={`${logo} logo`}
              key={idx}
              src={`https://dub.co/_static/clients/${logo}.svg`}
              width={520}
              height={182}
              className="h-12 grayscale transition-all hover:grayscale-0"
            />
          ))}
        </a>
      </div>
    </div>
  );
}
