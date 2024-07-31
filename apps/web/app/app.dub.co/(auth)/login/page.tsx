import { Button, ClientOnly, Wordmark } from "@dub/ui";
import { HOME_DOMAIN, constructMetadata } from "@dub/utils";
import { Suspense } from "react";
import LoginForm from "./form";

export const metadata = constructMetadata({
  title: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function LoginPage() {
  // Use ClientOnly because the login form relies on local storage for its initial render
  return (
    <ClientOnly className="relative z-10 my-10 flex min-h-full w-full flex-col items-center justify-center">
      <a href={HOME_DOMAIN}>
        <Wordmark className="h-10" />
      </a>
      <div className="mt-5 w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
        <div className="flex flex-col items-center justify-center gap-4 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-lg font-semibold">Sign in to your Dub account</h3>
        </div>
        <div className="flex flex-col bg-gray-50 px-4 py-8 sm:px-16">
          <div className="space-y-3">
            <Suspense
              fallback={
                <>
                  <Button disabled={true} variant="secondary" />
                  <Button disabled={true} variant="secondary" />
                  <Button disabled={true} variant="secondary" />
                  <div className="mx-auto h-5 w-3/4 rounded-lg bg-gray-100" />
                </>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
