import { Suspense } from "react";
import LoginForm from "./form";
import Button from "#/ui/button";
import { Logo } from "#/ui/icons";
import { constructMetadata } from "#/lib/utils";
import { HOME_DOMAIN } from "#/lib/constants";

export const metadata = constructMetadata({
  title: "Sign in to Dub",
});

export default function LoginPage() {
  return (
    <div className="z-10 mt-[calc(30vh)] h-fit w-full max-w-md overflow-hidden border border-gray-100 sm:rounded-2xl sm:shadow-xl">
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
        <a href={HOME_DOMAIN}>
          <Logo className="h-10 w-10" />
        </a>
        <h3 className="text-xl font-semibold">Sign in to Dub</h3>
        <p className="text-sm text-gray-500">
          Start creating short links with superpowers.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
            <Button disabled={true} text="" variant="secondary" />
            <Button disabled={true} text="" variant="secondary" />
            <Button disabled={true} text="" variant="secondary" />
            <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
