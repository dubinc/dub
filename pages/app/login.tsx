import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoadingDots } from "@/components/shared/icons";

export default function Login() {
  const [signInClicked, setSignInClicked] = useState(false);
  const [buttonText, setButtonText] = useState("Send magic link");

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="inline-block w-full max-w-md py-8 px-4 sm:px-16 overflow-hidden text-center align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <h1 className="font-bold text-3xl mb-4">Log In to Dub</h1>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSignInClicked(true);
            signIn("email", {
              email: e.currentTarget.email.value,
              redirect: false,
            }).then((res) => {
              setSignInClicked(false);
              if (res?.ok && !res?.error) {
                setButtonText("Email sent - check your inbox!");
              } else {
                setButtonText("Error sending email - try again?");
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
      </div>
    </div>
  );
}
