import { FramerButton } from "@/ui/auth/login/framer-button";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import Link from "next/link";

export const metadata = constructMetadata({
  title: `Sign in to Framer Partners`,
  canonicalUrl: `${APP_DOMAIN}/login`,
});

export default function FramerLoginPage() {
  return (
    <div className="mx-auto my-10 w-full max-w-md">
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className="text-lg font-medium text-neutral-800">
          Sign in to Framer Partners
        </h1>
        <p className="text-center text-sm text-neutral-700">
          Not a Framer Partner?&nbsp;
          <Link
            href="/framer/apply"
            className="font-normal underline underline-offset-2 transition-colors hover:text-black"
          >
            Apply today
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <FramerButton />
      </div>
    </div>
  );
}
