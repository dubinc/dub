import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Meta from "@/components/layout/meta";
import BlurImage from "@/components/shared/blur-image";
import { LoadingDots } from "@/components/shared/icons";

export default function Login() {
  const [signInClicked, setSignInClicked] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [email, setEmail] = useState("");
  const [buttonText, setButtonText] = useState("Send magic link");

  return (
    <div className="h-screen w-screen flex justify-center items-center bg-gray-50">
      <Meta />
      <div className="w-full max-w-md shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col justify-center items-center space-y-3 text-center sm:px-16 px-4 pt-8 py-6 border-b border-gray-200 bg-white">
          <BlurImage
            src="/static/logo.png"
            alt="Dub.sh logo"
            className="w-10 h-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="font-semibold text-xl">Sign Up</h3>
          <p className="text-sm text-gray-500">
            Get started for free. No credit card required.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSignInClicked(true);
            fetch("/api/auth/account-exists", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            }).then(async (res) => {
              const { exists } = await res.json();
              if (!exists) {
                signIn("email", {
                  email,
                  redirect: false,
                }).then((res) => {
                  setSignInClicked(false);
                  if (res?.ok && !res?.error) {
                    setButtonText("Email sent - check your inbox!");
                  } else {
                    setButtonText("Error sending email - try again?");
                  }
                });
              } else {
                setAccountExists(true);
                setSignInClicked(false);
              }
            });
          }}
          className="flex flex-col space-y-4 bg-gray-50 sm:px-16 px-4 py-8"
        >
          <div>
            <label htmlFor="email" className="block text-xs text-gray-600">
              EMAIL ADDRESS
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="panic@thedis.co"
              autoComplete="email"
              required
              onChange={(e) => {
                setAccountExists(false);
                setEmail(e.target.value);
              }}
              className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <button
            disabled={signInClicked}
            className={`${
              signInClicked
                ? "cursor-not-allowed bg-gray-100 border-gray-200"
                : "bg-black hover:bg-white text-white hover:text-black border-black"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {signInClicked ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>{buttonText}</p>
            )}
          </button>
          {accountExists ? (
            <p className="text-red-500 text-center text-sm">
              This email is already registered.{" "}
              <Link href="/login">
                <a className="text-red-600 font-semibold">Log in</a>
              </Link>{" "}
              instead?
            </p>
          ) : (
            <p className="text-gray-600 text-center text-sm">
              Already registered?{" "}
              <Link href="/login">
                <a className="text-gray-800 font-semibold">Sign in</a>
              </Link>{" "}
              to your account.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
