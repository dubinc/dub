import { useState } from "react";
import { signIn } from "next-auth/react";
import Meta from "@/components/layout/meta";
import BlurImage from "#/ui/blur-image";
import Background from "#/ui/home/background";
import { Google } from "@/components/shared/icons";
import Button from "#/ui/button";
import { SSOWaitlist } from "#/ui/tooltip";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const { next } = router.query as { next?: string };
  const [clickedGoogle, setClickedGoogle] = useState(false);

  return (
    <div className="flex h-screen w-screen justify-center">
      <Meta title="Sign up for Dub" />
      <Background />
      <div className="z-10 mt-[calc(30vh)] h-fit w-full max-w-md overflow-hidden border border-gray-100 sm:rounded-2xl sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <a
            href={
              process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
                ? "https://dub.sh"
                : "http://localhost:3000"
            }
          >
            <BlurImage
              src="/_static/logo.png"
              alt="Dub.sh logo"
              className="h-10 w-10 rounded-full"
              width={20}
              height={20}
            />
          </a>
          <h3 className="text-xl font-semibold">Create your Dub account</h3>
          <p className="text-sm text-gray-500">
            Get started for free. No credit card required.
          </p>
        </div>

        <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
          <Button
            text="Continue with Google"
            onClick={() => {
              setClickedGoogle(true);
              signIn("google", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              });
            }}
            loading={clickedGoogle}
            icon={<Google className="h-4 w-4" />}
          />
          <Button
            text="Continue with SAML SSO"
            disabled
            disabledTooltip={<SSOWaitlist />}
          />
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-gray-500 transition-colors hover:text-black"
            >
              Sign in
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
