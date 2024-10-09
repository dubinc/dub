import { Wordmark } from "@dub/ui/src/wordmark";
import Link from "next/link";
import { Background } from "./app.dub.co/(onboarding)/background";

export default function NotFound() {
  return (
    <>
      <div className="relative z-10 flex flex-col items-center">
        <Link href="/">
          <Wordmark className="mt-6 h-8" />
        </Link>
        <div className="mt-8 flex w-full flex-col items-center px-3 pb-16 md:mt-20 lg:px-8">
          <h1 className="my-3 text-xl font-semibold text-gray-700">
            Page Not Found
          </h1>
          <p className="z-10 max-w-sm text-center text-sm text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <img
            src="/_static/illustrations/coffee-call.svg"
            alt="No links yet"
            width={400}
            height={400}
          />
          <Link
            href="/"
            className="mt-4 flex h-9 w-fit items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white hover:bg-gray-800 hover:ring-4 hover:ring-gray-200"
          >
            Go back home
          </Link>
        </div>
      </div>
      <Background />
    </>
  );
}
