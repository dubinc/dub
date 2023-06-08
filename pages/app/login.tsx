import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Meta from "@/components/layout/meta";
import BlurImage from "#/ui/blur-image";
import Background from "#/ui/home/background";
import { toast } from "sonner";
import Button from "#/ui/button";
import { Google } from "@/components/shared/icons";
import { SSOWaitlist } from "#/ui/tooltip";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const { next, error } = router.query as { next?: string; error?: string };
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [noSuchAccount, setNoSuchAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedEmail, setClickedEmail] = useState(false);

  useEffect(() => {
    error && toast.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen justify-center">
      <Meta title="Sign in to Dub" />
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
          <h3 className="text-xl font-semibold">Sign in to Dub</h3>
          <p className="text-sm text-gray-500">
            Start creating short links with superpowers.
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
            disabled={clickedEmail}
            icon={<Google className="h-4 w-4" />}
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setClickedEmail(true);
              fetch("/api/auth/account-exists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              })
                .then(async (res) => {
                  const { exists } = await res.json();
                  if (exists) {
                    signIn("email", {
                      email,
                      redirect: false,
                      ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                    }).then((res) => {
                      setClickedEmail(false);
                      if (res?.ok && !res?.error) {
                        setEmail("");
                        toast.success("Email sent - check your inbox!");
                      } else {
                        toast.error("Error sending email - try again?");
                      }
                    });
                  } else {
                    toast.error("No account found with that email address.");
                    setNoSuchAccount(true);
                    setClickedEmail(false);
                  }
                })
                .catch(() => {
                  setClickedEmail(false);
                  toast.error("Error sending email - try again?");
                });
            }}
            className="flex flex-col space-y-3"
          >
            {showEmailOption && (
              <div>
                <div className="mb-4 mt-1 border-t border-gray-300" />
                <input
                  id="email"
                  name="email"
                  autoFocus
                  type="email"
                  placeholder="panic@thedis.co"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setNoSuchAccount(false);
                    setEmail(e.target.value);
                  }}
                  className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
              </div>
            )}
            <Button
              text="Continue with Email"
              variant="secondary"
              {...(!showEmailOption && {
                type: "button",
                onClick: (e) => {
                  e.preventDefault();
                  setShowEmailOption(true);
                },
              })}
              loading={clickedEmail}
              disabled={clickedGoogle}
            />
          </form>
          <Button
            text="Continue with SAML SSO"
            disabled
            disabledTooltip={<SSOWaitlist />}
          />

          {noSuchAccount ? (
            <p className="text-center text-sm text-red-500">
              No such account.{" "}
              <Link href="/register" className="font-semibold text-red-600">
                Sign up
              </Link>{" "}
              instead?
            </p>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-gray-500 transition-colors hover:text-black"
              >
                Sign up
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
