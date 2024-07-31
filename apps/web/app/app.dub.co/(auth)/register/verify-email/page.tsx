import { BlurImage, Button, Logo } from "@dub/ui";
import { constructMetadata, HOME_DOMAIN } from "@dub/utils";
import { Suspense } from "react";
import VerifyEmailForm from "./form";

export const metadata = constructMetadata({
  title: `Create your ${process.env.NEXT_PUBLIC_APP_NAME} account`,
});

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

export const runtime = "nodejs";

export default function VerifyEmailPage() {
  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-5">
      <div className="col-span-1 flex items-center justify-center md:col-span-3">
        <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
            <a href={HOME_DOMAIN}>
              <Logo className="h-10 w-10" />
            </a>
            <h3 className="text-xl font-semibold">Verify your email</h3>
            <p className="text-sm text-gray-500">
              Enter the 6 digits verification code sent to your email address.
            </p>
          </div>
          <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
            <Suspense
              fallback={
                <>
                  <Button disabled={true} text="" variant="secondary" />
                  <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
                </>
              }
            >
              <VerifyEmailForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="hidden h-full flex-col justify-center space-y-12 overflow-hidden border-l border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur md:col-span-2 md:flex">
        <a
          href="https://dub.co/features/analytics"
          target="_blank"
          className="ml-12 h-1/2 w-[112%] rounded-xl border border-gray-200 p-2 shadow-xl"
        >
          <BlurImage
            alt="Dub.co Analytics"
            src="https://assets.dub.co/features/analytics.png"
            width={1735}
            height={990}
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
