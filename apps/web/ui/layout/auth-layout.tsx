import { BlurImage, ClientOnly } from "@dub/ui";
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

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-5">
      <div className="col-span-1 flex min-h-screen flex-col items-center justify-between border-r border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur sm:col-span-3">
        <div className="flex h-full w-full flex-col items-center justify-center">
          <ClientOnly className="relative flex w-full flex-col items-center justify-center">
            <Suspense>{children}</Suspense>
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
        <div className="ml-12 h-1/2 w-[140%] rounded-xl border border-gray-200 p-2 shadow-xl">
          <BlurImage
            alt="Dub.co Analytics"
            src="https://assets.dub.co/changelog/new-dashboard.jpg"
            width={2400}
            height={1260}
            className="aspect-[2400/1260] h-full rounded-lg object-cover object-left-top border border-gray-200"
          />
        </div>
        <a
          href="https://dub.co/customers"
          target="_blank"
          className="animate-infinite-scroll flex items-center space-x-4"
        >
          {logos.map((logo, idx) => (
            <BlurImage
              alt={`${logo} logo`}
              key={idx}
              src={`https://assets.dub.co/clients/${logo}.svg`}
              width={520}
              height={182}
              className="h-12 grayscale transition-all hover:grayscale-0"
            />
          ))}
        </a>
      </div>
    </div>
  );
};
