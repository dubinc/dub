import { AuthType } from "@/ui/modals/auth-modal.tsx";
import { ClientOnly } from "@dub/ui";
import { ReactNode, Suspense } from "react";
import { ConsentNotice } from "../../app/app.dub.co/(auth)/consent-notice.tsx";

// const logos = [
//   "vercel",
//   "perplexity",
//   "prisma",
//   "tinybird",
//   "hashnode",
//   "cal",
//   "vercel",
//   "perplexity",
//   "prisma",
//   "tinybird",
//   "hashnode",
//   "cal",
// ];

interface AuthLayoutProps {
  children: ReactNode;
  authType?: AuthType;
}

export const AuthLayout = ({
  children,
  authType = "login",
}: AuthLayoutProps) => {
  return (
    // <div className="grid w-full grid-cols-1 md:grid-cols-5">
    <div className="h-full w-full">
      <div className="border-border-500 col-span-1 flex min-h-screen flex-col items-center justify-center border-r bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur sm:col-span-3">
        <div className="flex h-full w-full flex-col items-center justify-center">
          <ClientOnly className="relative flex w-full flex-col items-center justify-center">
            <Suspense>{children}</Suspense>
          </ClientOnly>
        </div>

        <div className="grid gap-2 pb-8 pt-4">
          {/*<p className="text-xs text-neutral-600">*/}
          {/*  © {new Date().getFullYear()} GetQR.*/}
          {/*</p>*/}
          {authType === "login" ? (
            <div className="flex gap-3 text-center text-xs text-neutral-500 underline underline-offset-2">
              <a
                href="/privacy-policy"
                // target="_blank"
                className="hover:text-neutral-800"
              >
                Privacy Policy
              </a>
              <a
                href="/eula"
                // target="_blank"
                className="hover:text-neutral-800"
              >
                Terms & Conditions
              </a>
            </div>
          ) : (
            <ConsentNotice />
          )}
        </div>
      </div>

      {/*<div className="hidden h-full flex-col justify-center space-y-12 overflow-hidden md:col-span-2 md:flex">*/}
      {/*  <div className="ml-12 h-1/2 w-[140%] rounded-xl border border-neutral-200 p-2 shadow-xl">*/}
      {/*    <BlurImage*/}
      {/*      alt="Dub.co Analytics"*/}
      {/*      src="https://assets.dub.co/changelog/new-dashboard.jpg"*/}
      {/*      width={2400}*/}
      {/*      height={1260}*/}
      {/*      className="aspect-[2400/1260] h-full rounded-lg border border-neutral-200 object-cover object-left-top"*/}
      {/*    />*/}
      {/*  </div>*/}
      {/*  /!*<a*!/*/}
      {/*  /!*  href="https://dub.co/customers"*!/*/}
      {/*  /!*  target="_blank"*!/*/}
      {/*  /!*  className="animate-infinite-scroll flex items-center space-x-4"*!/*/}
      {/*  /!*>*!/*/}
      {/*  /!*  {logos.map((logo, idx) => (*!/*/}
      {/*  /!*    <BlurImage*!/*/}
      {/*  /!*      alt={`${logo} logo`}*!/*/}
      {/*  /!*      key={idx}*!/*/}
      {/*  /!*      src={`https://assets.dub.co/clients/${logo}.svg`}*!/*/}
      {/*  /!*      width={520}*!/*/}
      {/*  /!*      height={182}*!/*/}
      {/*  /!*      className="h-12 grayscale transition-all hover:grayscale-0"*!/*/}
      {/*  /!*    />*!/*/}
      {/*  /!*  ))}*!/*/}
      {/*  /!*</a>*!/*/}

      {/*</div>*/}
    </div>
  );
};
