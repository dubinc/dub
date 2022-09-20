import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LoadingDots } from "@/components/shared/icons";
import Meta from "@/components/layout/meta";

export default function Login() {
  const [signInClicked, setSignInClicked] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [email, setEmail] = useState("");
  const [buttonText, setButtonText] = useState("Send magic link");

  return (
    <div className="h-screen w-screen flex justify-center items-center bg-gray-50">
      <Meta />
      <div className="flex flex-col space-y-4 w-full max-w-md py-12 px-4 sm:px-16 overflow-hidden text-center align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <h1 className="font-bold font-display text-3xl">Sign Up</h1>
        <p className="text-gray-600 text-sm">
          Get started for free. No credit card required.
        </p>
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
          className="mt-5 flex flex-col space-y-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            required
            onChange={(e) => {
              setAccountExists(false);
              setEmail(e.target.value);
            }}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
          />
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
        </form>
        {accountExists ? (
          <p className="text-red-500 text-sm">
            This email is already registered.{" "}
            <Link href="/login">
              <a className="text-red-600 font-semibold">Log in</a>
            </Link>{" "}
            instead?
          </p>
        ) : (
          <p className="text-gray-600 text-sm">
            Already registered?{" "}
            <Link href="/login">
              <a className="text-gray-800 font-semibold">Sign in</a>
            </Link>{" "}
            to your account.
          </p>
        )}
      </div>
    </div>
  );
}
