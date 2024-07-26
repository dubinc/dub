"use client";

import { BlurImage } from "@dub/ui";
import { useState } from "react";
import SignUpForm from "./signup";
import { VerifyOTP } from "./verify-otp";

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

export default function RegisterPageClient() {
  const [authView, setAuthView] = useState<"signup" | "otp">("signup");

  console.log({ authView });

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-5">
      {authView === "signup" && <SignUpForm setAuthView={setAuthView} />}
      {authView === "otp" && <VerifyOTP />}

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
